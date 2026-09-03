/*  This script finds references to things that no longer exist in the Platform Manager (EMS) JSON stores:
    ems-sites, ems-device-types, ems-devices and ems-global-settings.
    Tested against Mango 5.7.5.

    Part 1, deleted roles. Deleting a role does not remove its xid from these stores, and the editors cannot
    remove an xid that no longer resolves to a role, so the ghost xid stays visible in the Site, Device,
    Device Type and General Overview cards forever. The script reports these and, with dryRun turned off,
    removes them. That grants and revokes nothing: a role xid that does not resolve is already dropped when
    the permission is evaluated (EmsService.hasPermission), so it meant nothing before or after. Read the
    "becomes empty" warnings though - an array pruned to nothing is superadmin-only from then on, which is
    what it already was in practice, but it is the one thing worth re-assigning afterwards.

    Part 2, every other dangling reference - sites, device types, devices, watch lists and custom pages.
    These are reported only, never changed. Unlike a dead role xid they change what the UI shows: an orphaned
    device disappears from its site, a device type whose sites are all gone is hidden from non-superadmins,
    and a dead watch list or page xid renders an empty tab. The right repair - repoint, delete, or recreate
    the missing thing - is a judgement call per entity, so the script only says where they are.

    Data point references are out of scope. Everything above is a broken pointer between two things Mango
    gives an xid to, so "it is not there" is a fact. Points are referenced by name and matched per device by
    tag, so it is not: a name that exists nowhere may simply not be provisioned yet, and a name that exists
    somewhere may still not resolve for a given device. That is per-device coverage, and wants its own report.

    Take a configuration export with "JSON Data" selected before turning dryRun off - that is the restore
    path. Re-running is always safe; the second run finds nothing left to do.

    The following parameters are configurable:
    - dryRun: true to report only, false to remove the dangling role xids found by part 1
    - auditOtherReferences: false to skip part 2
*/

const dryRun = true;
const auditOtherReferences = true;

const SITES_XID = 'ems-sites';
const DEVICE_TYPES_XID = 'ems-device-types';
const DEVICES_XID = 'ems-devices';
const GLOBAL_SETTINGS_XID = 'ems-global-settings';
const PAGES_XID = 'mangoUI-pages';

/** The three entity stores are a map of entity xid to entity. ems-global-settings is a map of category to document. */
const ENTITY_STORE_XIDS = [SITES_XID, DEVICE_TYPES_XID, DEVICES_XID];
const STORE_XIDS = [SITES_XID, DEVICE_TYPES_XID, DEVICES_XID, GLOBAL_SETTINGS_XID];

/** "readPermissions", or a per-card field such as "kpisOnTopReadPermissions". Never "readPermission" (singular),
 *  which is Mango's own array-of-minterms permission shape and has nothing to do with these role xid lists. */
const PERMISSION_FIELD = /^(?:readPermissions|[A-Za-z0-9_]+ReadPermissions)$/;

/**
 * Subtrees the walk never enters. A tab's "options" is an arbitrary blob the operator types into an ace
 * editor (chart settings, component configuration - see ems/web-src/.../tabEditor/tabEditor.html), so a
 * "readPermissions" key inside it is somebody's own data and has nothing to do with EMS role permissions.
 */
const IGNORED_KEYS = ['options'];

const Common = Java.type('com.serotonin.m2m2.Common');
const jsonDataService = services.jsonDataService;
const permissionService = services.permissionService;

// -------------------------------------------------------------------------------------- pointers, walking

/** RFC 6901: ~ then / , in that order. */
function escapeToken(token) {
    return String(token).split('~').join('~0').split('/').join('~1');
}

function unescapeToken(token) {
    return String(token).split('~1').join('/').split('~0').join('~');
}

/** First pointer segment - the entity xid in the three entity stores, the category in ems-global-settings. */
function ownerOf(pointer) {
    const parts = pointer.split('/');
    return parts.length > 1 ? unescapeToken(parts[1]) : '(root)';
}

/**
 * Depth-first walk over a parsed document. visit(pointer, key, value) is called for every property; return
 * true from it to stop the walk descending into that value.
 */
function walk(node, pointer, visit) {
    if (Array.isArray(node)) {
        for (let i = 0; i < node.length; i++) {
            if (!visit(pointer + '/' + i, i, node[i])) {
                walk(node[i], pointer + '/' + i, visit);
            }
        }
    } else if (node !== null && typeof node === 'object') {
        for (const key of Object.keys(node)) {
            if (IGNORED_KEYS.includes(key)) {
                continue;
            }
            const childPointer = pointer + '/' + escapeToken(key);
            if (!visit(childPointer, key, node[key])) {
                walk(node[key], childPointer, visit);
            }
        }
    }
}

function isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// ------------------------------------------------------------------------------------------ reading stores

/** storeXid -> parsed document, or null when the store is absent/unreadable/malformed. */
const documents = {};
const storeStatus = {};

for (const storeXid of STORE_XIDS) {
    try {
        const parsed = JSON.parse(String(jsonDataService.getDataAtPointer(storeXid, '')));
        if (!isObject(parsed)) {
            documents[storeXid] = null;
            storeStatus[storeXid] = 'malformed: document root is not an object';
        } else {
            documents[storeXid] = parsed;
            storeStatus[storeXid] = 'ok';
        }
    } catch (e) {
        documents[storeXid] = null;
        storeStatus[storeXid] = 'could not be read: ' + e;
    }
}

// ================================================================ PART 1 - deleted role references

const roleExists = new Map();

/**
 * Authoritative existence check - the same lookup EmsService uses to decide whether a listed xid means
 * anything. It is a loading cache over the roles table, so a role missing from it is genuinely gone.
 */
function isDanglingRole(xid) {
    if (!roleExists.has(xid)) {
        roleExists.set(xid, permissionService.getRole(xid) !== null);
    }
    return !roleExists.get(xid);
}

const roleReport = [];
const roleWarnings = [];
let totalArrays = 0;
let totalReferences = 0;
let totalEmptied = 0;

for (const storeXid of STORE_XIDS) {
    const entry = { storeXid: storeXid, status: storeStatus[storeXid], hits: [] };
    roleReport.push(entry);
    const document = documents[storeXid];
    if (document === null) {
        continue;
    }

    // Rather than hard coding the seven known locations, treat every "readPermissions" / "<name>ReadPermissions"
    // array of strings as a list of role xids - so locations added later are covered too.
    walk(document, '', function (pointer, key, value) {
        if (!PERMISSION_FIELD.test(String(key)) || !Array.isArray(value)) {
            return false;
        }
        const kept = [];
        const removed = [];
        const removedCounts = new Map();
        let nonStrings = 0;
        for (const element of value) {
            if (typeof element !== 'string') {
                nonStrings++;
                kept.push(element);
            } else if (isDanglingRole(element)) {
                removed.push(element);
                removedCounts.set(element, (removedCounts.get(element) || 0) + 1);
            } else {
                kept.push(element);
            }
        }
        if (nonStrings > 0) {
            roleWarnings.push('! ' + storeXid + ' ' + pointer + ' holds ' + nonStrings
                + ' non-string element(s), left untouched');
        }
        if (removed.length > 0) {
            totalArrays++;
            totalReferences += removed.length;
            if (kept.length === 0) {
                totalEmptied++;
                roleWarnings.push('! ' + storeXid + ' ' + pointer + ' becomes empty - visible to superadmins '
                    + 'only from now on (it already was in practice). Re-assign a role if it should stay visible.');
            }
            entry.hits.push({
                pointer: pointer,
                owner: ownerOf(pointer),
                original: value,
                kept: kept,
                removed: removed,
                // one entry per dead xid, "(x2)" where the same one was listed twice
                names: [...removedCounts].map(([xid, count]) => (count > 1 ? xid + ' (x' + count + ')' : xid))
            });
        }
        return true; // a permissions array holds strings, nothing to descend into
    });
}

// ================================================================ PART 2 - every other dangling reference

const audit = [];
const auditNotes = [];

/** Every finding is addressed the same way part 1 addresses its arrays: store plus a JSON pointer. */
function finding(category, storeXid, pointer, message) {
    audit.push({ category: category, storeXid: storeXid, pointer: pointer, message: message });
}

/**
 * The identity of an entity is its embedded xid - that is what EmsService resolves a Device's siteXid and a
 * Device Type's sites against, not the map key (see EmsService#visibleSiteXids). An entity saved without one
 * falls back to its key so it is not reported as missing everywhere at once; the mismatch itself is reported
 * separately below.
 */
function identitySet(storeXid) {
    const found = new Set();
    const document = documents[storeXid];
    if (document === null) return found;
    for (const key of Object.keys(document)) {
        const entity = document[key];
        const embedded = isObject(entity) && typeof entity.xid === 'string' ? entity.xid : null;
        found.add(embedded !== null ? embedded : key);
    }
    return found;
}

/** Runs fn(entityKey, entity) over an entity store, or over the categories of ems-global-settings. */
function forEachEntity(storeXid, fn) {
    const document = documents[storeXid];
    if (document === null) return;
    for (const key of Object.keys(document)) {
        if (isObject(document[key])) {
            fn(key, document[key]);
        }
    }
}

/** Runs fn(pointer, tab) over every layout.grid.items[].tabs[] entry of an entity or settings category. */
function forEachTab(entity, basePointer, fn) {
    if (!isObject(entity) || !isObject(entity.layout) || !isObject(entity.layout.grid)
            || !Array.isArray(entity.layout.grid.items)) {
        return;
    }
    const items = entity.layout.grid.items;
    for (let i = 0; i < items.length; i++) {
        if (!isObject(items[i]) || !Array.isArray(items[i].tabs)) continue;
        for (let t = 0; t < items[i].tabs.length; t++) {
            if (isObject(items[i].tabs[t])) {
                fn(basePointer + '/layout/grid/items/' + i + '/tabs/' + t, items[i].tabs[t]);
            }
        }
    }
}

if (auditOtherReferences) {
    const siteIds = identitySet(SITES_XID);
    const deviceTypeIds = identitySet(DEVICE_TYPES_XID);

    // --- entity key vs embedded xid. EmsService keys visibility off the embedded xid, so a mismatch makes an
    // entity unreachable by everything that refers to it.
    for (const storeXid of ENTITY_STORE_XIDS) {
        forEachEntity(storeXid, function (key, entity) {
            if (typeof entity.xid !== 'string') {
                finding('entity identity', storeXid, '/' + escapeToken(key), "has no embedded 'xid'");
            } else if (entity.xid !== key) {
                finding('entity identity', storeXid, '/' + escapeToken(key) + '/xid',
                        "'" + entity.xid + "' - does not match the key it is stored under");
            }
        });
    }

    // --- Device.siteXid and Device.deviceTypeXid
    forEachEntity(DEVICES_XID, function (key, device) {
        if (typeof device.siteXid !== 'string' || device.siteXid === '') {
            finding('device -> site', DEVICES_XID, '/' + escapeToken(key) + '/siteXid',
                    'missing or empty - the device belongs to no site');
        } else if (!siteIds.has(device.siteXid)) {
            finding('device -> site', DEVICES_XID, '/' + escapeToken(key) + '/siteXid',
                    "'" + device.siteXid + "' - no such site");
        }
        if (typeof device.deviceTypeXid === 'string' && device.deviceTypeXid !== ''
                && !deviceTypeIds.has(device.deviceTypeXid)) {
            finding('device -> device type', DEVICES_XID, '/' + escapeToken(key) + '/deviceTypeXid',
                    "'" + device.deviceTypeXid + "' - no such device type");
        }
    });

    // --- DeviceType.sites[]. A device type whose sites are all gone is hidden from every non-superadmin
    // (EmsService#canReadViaSites fails closed on an empty or unresolvable sites array).
    forEachEntity(DEVICE_TYPES_XID, function (key, deviceType) {
        const sitesPointer = '/' + escapeToken(key) + '/sites';
        if (!Array.isArray(deviceType.sites)) {
            finding('device type -> sites', DEVICE_TYPES_XID, sitesPointer,
                    'not an array - hidden from non-superadmins');
            return;
        }
        if (deviceType.sites.length === 0) {
            finding('device type -> sites', DEVICE_TYPES_XID, sitesPointer,
                    'empty - hidden from non-superadmins');
            return;
        }
        let live = 0;
        for (let i = 0; i < deviceType.sites.length; i++) {
            const site = deviceType.sites[i];
            if (typeof site !== 'string') {
                finding('device type -> sites', DEVICE_TYPES_XID, sitesPointer + '/' + i, 'not a string');
            } else if (siteIds.has(site)) {
                live++;
            } else {
                finding('device type -> sites', DEVICE_TYPES_XID, sitesPointer + '/' + i,
                        "'" + site + "' - no such site");
            }
        }
        if (live === 0) {
            finding('device type -> sites', DEVICE_TYPES_XID, sitesPointer,
                    'no site it names still exists - hidden from non-superadmins');
        }
    });

    // --- Site column -> device. A site column of type POINT stores the device's tagValue in deviceID.
    const deviceTagValues = new Set();
    forEachEntity(DEVICES_XID, function (key, device) {
        if (typeof device.tagValue === 'string') deviceTagValues.add(device.tagValue);
    });
    forEachEntity(SITES_XID, function (key, site) {
        walk(site, '/' + escapeToken(key), function (pointer, k, value) {
            if (k === 'deviceID' && typeof value === 'string' && value !== '' && !deviceTagValues.has(value)) {
                finding('column -> device', SITES_XID, pointer,
                        "'" + value + "' - no device has that tag value");
            }
            return false;
        });
    });

    // --- WATCHLIST tabs -> watch lists, DASHBOARD tabs -> custom pages.
    const watchListService = services.watchListService;
    if (!watchListService) {
        auditNotes.push('the Watchlist module is not installed, so watch list references were not checked');
    }
    const watchListExists = new Map();
    function isDanglingWatchList(xid) {
        if (!watchListExists.has(xid)) {
            let exists;
            try {
                exists = watchListService.get(xid) !== null;
            } catch (e) {
                exists = false; // NotFoundException
            }
            watchListExists.set(xid, exists);
        }
        return !watchListExists.get(xid);
    }

    let pageIds = null;
    try {
        const pages = JSON.parse(String(jsonDataService.getDataAtPointer(PAGES_XID, '')));
        if (isObject(pages) && Array.isArray(pages.pages)) {
            pageIds = new Set();
            for (const page of pages.pages) {
                if (isObject(page) && typeof page.xid === 'string') pageIds.add(page.xid);
            }
        }
    } catch (e) {
        auditNotes.push('the ' + PAGES_XID + ' store is absent, so DASHBOARD tab references were not checked');
    }

    function auditTabs(storeXid, entity, basePointer) {
        forEachTab(entity, basePointer, function (pointer, tab) {
            if (tab.type === 'WATCHLIST' && watchListService && Array.isArray(tab.items)) {
                for (let i = 0; i < tab.items.length; i++) {
                    const item = tab.items[i];
                    if (isObject(item) && typeof item.xid === 'string' && item.xid !== ''
                            && isDanglingWatchList(item.xid)) {
                        finding('tab -> watch list', storeXid, pointer + '/items/' + i + '/xid',
                                "'" + item.xid + "' - no such watch list");
                    }
                }
            }
            if (tab.type === 'DASHBOARD' && pageIds !== null && typeof tab.xid === 'string' && tab.xid !== ''
                    && !pageIds.has(tab.xid)) {
                finding('tab -> custom page', storeXid, pointer + '/xid',
                        "'" + tab.xid + "' - no such page in " + PAGES_XID);
            }
        });
    }

    for (const storeXid of [SITES_XID, DEVICE_TYPES_XID, GLOBAL_SETTINGS_XID]) {
        forEachEntity(storeXid, function (key, entity) {
            auditTabs(storeXid, entity, '/' + escapeToken(key));
        });
    }
}

// ---------------------------------------------------------------------------------------------- report

try {
    if (typeof response !== 'undefined' && response !== null) {
        response.setContentType('text/plain');
    }
} catch (ignored) {
    // output is a download rather than inline text, not worth failing over
}

console.log('EMS dangling reference report');
console.log('mode: ' + (dryRun ? 'DRY RUN - nothing will be written' : 'APPLY - dangling role xids will be removed'));
console.log('run by: ' + Common.getUser().getPermissionHolderName());
console.log('');
console.log('PART 1 - DELETED ROLE REFERENCES (removed by this script)');
console.log('');

for (const entry of roleReport) {
    if (entry.status !== 'ok') {
        console.log('[' + entry.storeXid + '] ' + entry.status);
        continue;
    }
    if (entry.hits.length === 0) {
        console.log('[' + entry.storeXid + '] no dangling role references');
        continue;
    }
    console.log('[' + entry.storeXid + ']');
    let owner = null;
    for (const hit of entry.hits) {
        if (hit.owner !== owner) {
            owner = hit.owner;
            console.log('  ' + owner);
        }
        console.log('    ' + hit.pointer.padEnd(58) + ' remove: ' + hit.names.join(', ')
            + (hit.kept.length === 0 ? '   ** BECOMES EMPTY **' : ''));
    }
}

if (roleWarnings.length > 0) {
    console.log('');
    console.log('  WARNINGS');
    for (const warning of roleWarnings) {
        console.log('    ' + warning);
    }
}

console.log('');
console.log('  arrays to change: ' + totalArrays + '   references to remove: ' + totalReferences
    + '   arrays left empty: ' + totalEmptied);

console.log('');
console.log('PART 2 - OTHER DANGLING REFERENCES (reported only, nothing is changed)');
console.log('');

if (!auditOtherReferences) {
    console.log('  skipped - auditOtherReferences is false');
} else if (audit.length === 0) {
    console.log('  none found');
} else {
    // findings are collected store by store, so group them here - a category must appear once
    const categories = [...new Set(audit.map(item => item.category))];
    for (const category of categories) {
        console.log('  [' + category + ']');
        for (const item of audit) {
            if (item.category === category) {
                console.log('    ' + (item.storeXid + ' ' + item.pointer).padEnd(62) + ' ' + item.message);
            }
        }
    }
    console.log('');
    console.log('  ' + audit.length + ' finding(s). Each needs a decision - repoint it, delete the entity, or');
    console.log('  recreate what is missing - so this script does not touch them.');
}

if (auditNotes.length > 0) {
    console.log('');
    console.log('  NOTES');
    for (const note of auditNotes) {
        console.log('    - ' + note);
    }
}

// ----------------------------------------------------------------------------------------------- apply

console.log('');
if (totalArrays === 0) {
    console.log('No role references to remove.');
} else if (dryRun) {
    console.log('DRY RUN - nothing was written. Set dryRun = false at the top of the script and run it again.');
} else {
    console.log('WRITING');
    let written = 0;
    let skipped = 0;
    for (const entry of roleReport) {
        for (const hit of entry.hits) {
            try {
                // One locked read-modify-write per array, so a Platform Manager edit made to some other
                // entity while this runs is not clobbered. Re-read first: if this array changed since it was
                // inspected, leave it alone rather than overwrite someone's edit with a stale value.
                const current = JSON.parse(String(jsonDataService.getDataAtPointer(entry.storeXid, hit.pointer)));
                if (JSON.stringify(current) !== JSON.stringify(hit.original)) {
                    skipped++;
                    console.log('  SKIPPED ' + entry.storeXid + ' ' + hit.pointer + ' - changed since it was read, re-run');
                    continue;
                }
                // a JS string picks the (String, String, String) overload; if a future signature ever makes
                // that ambiguous the explicit form is
                // jsonDataService['setDataAtPointer(java.lang.String,java.lang.String,java.lang.String)'](...)
                jsonDataService.setDataAtPointer(entry.storeXid, hit.pointer, JSON.stringify(hit.kept));
                written++;
                console.log('  updated ' + entry.storeXid + ' ' + hit.pointer);
            } catch (e) {
                skipped++;
                console.log('  FAILED  ' + entry.storeXid + ' ' + hit.pointer + ' - ' + e);
            }
        }
    }
    console.log('');
    console.log('  arrays written: ' + written + '   skipped: ' + skipped);
    console.log('  Every write is recorded as a JSON_DATA audit event. Run again to confirm nothing is left.');
}
