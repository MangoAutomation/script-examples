downloadJson({
    fileStore: 'default',
    filePath: 'export.json',
    excludeFields: [
        'publishers',
        'publishedPoints',
        'eventHandlers',
        'mailingLists',
        'excel-reports',
        'excel-report-templates',
        'advancedSchedules',
        'advancedScheduleCalendarRuleSets',
        'maintenanceEvents',
        'virtualSerialPorts',
        'BACnetLocalDevices',
        'security-sites',
        'security-doors',
        'security-boards',
        'security-cameras',
        'security-recordings',
        'security-door-groups',
        'security-users',
        'security-cards'
    ],
    /*
    for reference not being used (use excludeFields)
    includeFields: [
        'custom-xx',
        'systemSettings',
        'roles',
        'users',
        'permissions',
        'dataSources',
        'dataPoints',
        'jsonData',
        'watchLists',
        'sstGlobalScripts'
    ], */
    excludeSystemSettings: [
        'licenseAgreementVersion',
        'cloudConnect.',
        'jwt.',
        'publiclyResolvableBaseUrl',
        'instanceDescription',
        'emailSmtpHost',
        'emailSmtpUsername',
        'emailFromName',
        'emailFromAddress',
        'bacnet.localDeviceList'
    ],
    excludeDsTypes: ['INTERNAL', 'VIRTUAL'],
    keepDsTypes: ['META', 'SCRIPTING'],
    dsEnabled: false, //true, false, null (keep original states)
    ignoreMissingDpContext: true,
    excludeCustom: { //custom exclusion for tables with xid
        roles: ["superadmin", "user", "anonymous"],
        // watchLists: ['WL_e924fa26-e7ad-485b-9744-9e15170fdac4']
    }
});

/**
 * You dont need to edit below here!
 */

function readJson(fileStore, filePath) {
    const JavaString = Java.type('java.lang.String');
    const Files = Java.type('java.nio.file.Files');

    const path = services.fileStoreService.getPathForRead(fileStore, filePath);
    const fileString = new JavaString(Files.readAllBytes(path), 'UTF-8');
    return JSON.parse(fileString);
}

function downloadJson(options) {
    const result = convertToVirtual(options);
    const filename = 'import.json';
    response.setContentType('application/json');
    response.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    print(result);
}

function convertToVirtual(options) {
    const POINT_LOCATORS = {
        'BINARY': {
            dataType: 'BINARY',
            changeType: {
                type: 'ALTERNATE_BOOLEAN',
                startValue: "false"
            },
            settable: true
        },
        'MULTISTATE': {
            dataType: 'MULTISTATE',
            changeType: {
                type: 'INCREMENT_MULTISTATE',
                roll: true,
                values: [0, 1, 2, 3, 4],
                startValue: '0'
            },
            settable: true
        },
        'NUMERIC': {
            dataType : 'NUMERIC',
            changeType: {
                type: 'BROWNIAN',
                max: 100.0,
                maxChange: 0.5,
                min: 0.0,
                startValue: '50'
            },
            settable:true
        },
        'ALPHANUMERIC': {
            dataType: 'ALPHANUMERIC',
            changeType: {
                type: 'NO_CHANGE',
                startValue: "abcd"
            },
            settable: true
        }
    };

    const VIRTUAL_DS_TEMPLATE =    {
        "type": "VIRTUAL",
        "polling": true,
        "useCron": false,
        "quantize": false,
        "purgePeriod": 1,
        "purgeType": "YEARS",
        "purgeOverride": false,
        "alarmLevels": {
            "POLL_ABORTED": "URGENT"
        }
    };

    const data = readJson(options.fileStore, options.filePath);

    // exclude fields
    for (const field of options.excludeFields) {
        delete data[field];
    }

    // exclude custom Xids
    Object.keys(options.excludeCustom).forEach(field => {
        if (data[field]) {
            data[field] = data[field].filter(item => !options.excludeCustom[field].includes(item.xid));
        }
    });

    // exclude SystemSettings
    if (data.systemSettings) {
        for (const prefix of options.excludeSystemSettings) {
            Object.keys(data.systemSettings)
                .filter(key => key.startsWith(prefix))
                .forEach(s => delete data.systemSettings[s]);
        }
    }

    if (data.dataSources && data.dataPoints) {
        const toKeepDs = data.dataSources.filter(ds => options.keepDsTypes.includes(ds.type));
        const toKeepDSXids = toKeepDs.map(ds => ds.xid);
        const toKeepDp = data.dataPoints.filter(dp => toKeepDSXids.includes(dp.dataSourceXid));

        // Keep dataSource types
        for (let ds of toKeepDs) {
            if (options.dsEnabled !== null) ds.enabled = options.dsEnabled;
            if (ds.context && ds.context.some(x => x.dataPointXid == null)) {
                if (!options.ignoreMissingDpContext) {
                    print("Context point missing " + ds.xid);
                    print(JSON.stringify(ds.context));
                    return;
                }
                ds.context = ds.context.filter(x => x.dataPointXid !== null);
            }
        }

        // Keep dataPoints of those dataSources
        for (let dp of toKeepDp) {
            if (dp.pointLocator.context && dp.pointLocator.context.some(x => x.dataPointXid == null)) {
                if (!options.ignoreMissingDpContext) {
                    print("Context point missing " + dp.xid);
                    print(JSON.stringify(dp.pointLocator.context));
                    return;
                }
                dp.pointLocator.context = dp.pointLocator.context.filter(x => x.dataPointXid !== null);
            }
        }

        // Convert rest of dataSources and dataPoints to virtual
        data.dataSources = data.dataSources.filter(ds => !options.keepDsTypes.includes(ds.type) && !options.excludeDsTypes.includes(ds.type));
        const dataSourceXids = data.dataSources.map(ds => ds.xid);
        data.dataPoints = data.dataPoints.filter(dp => dataSourceXids.includes(dp.dataSourceXid));

        const virtualDs = [];
        for (let ds of data.dataSources) {
            const converted = JSON.parse(JSON.stringify(VIRTUAL_DS_TEMPLATE));
            converted.enabled = options.dsEnabled !== null ? options.dsEnabled : ds.enabled;
            converted.xid = ds.xid;
            converted.name = ds.name;
            converted.data = ds.data;
            converted.readPermission = ds.readPermission;
            converted.editPermission = ds.editPermission;
            converted.updatePeriods = ds.updatePeriods || 1;
            converted.updatePeriodType = ds.updatePeriodType || 'MINUTES';
            virtualDs.push(converted);
        }

        for (const dp of data.dataPoints) {
            const dataType = dp.pointLocator.dataType;
            if (dataType === 'IMAGE') {
                throw new Error(`Datapoint ${dp.xid} has data type IMAGE which is unsupported by virtual data sources`);
            }

            dp.pointLocator = POINT_LOCATORS[dataType];
            if (dataType === 'MULTISTATE' && dp.textRenderer.type === 'MULTISTATE') {
                dp.pointLocator.changeType.values = dp.textRenderer.multistateValues.map(msv => msv.key);
            }
        }

        data.dataSources = [...virtualDs, ...toKeepDs];
        data.dataPoints = [...data.dataPoints, ...toKeepDp];
    }

    return JSON.stringify(data, null, 2);
}
