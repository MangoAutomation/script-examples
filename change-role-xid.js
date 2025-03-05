/**
 * This script replaces spaces on XID for underscore for roles
 * Was tested MANGO 4.5.X
 * Last update Mar 2025
 * 
 * This steps are:
 * 1. Get all roles
 * 2. Check if the XID has space
 * 3. Replace spaces with underscore on XID
 * 4. Update role
 */

// imports
const Common = Java.type('com.serotonin.m2m2.Common');
const RoleVO = Java.type('com.serotonin.m2m2.vo.role.RoleVO');
const RoleDao = Java.type('com.serotonin.m2m2.db.dao.RoleDao');

const roleDao = Common.getBean(RoleDao.class);
const roleService = services.roleService;

// Function to check if a string contains a space
function hasSpace(xid) {
    return xid.includes(' ');
}

// Get roles
var roles = roleService.list();
var rolesUpdated = 0;
if (roles) {
    for (var i = 0; i < roles.length; i++) {
        var obj = roles[i];
        var xid = obj.getXid();

        // update role if XID has spaces
        if (hasSpace(xid)) {
            const nameWithoutSpace = xid.replace(' ','_');
            const updated = new RoleVO(obj.getId(), nameWithoutSpace, obj.getName());
            roleDao.update(obj.getId(), updated);
            console.log('Rol updated with XID: ', xid);
            rolesUpdated++;
        }
    }
} else {
    console.log("List of roles is undefined or null.");
}
console.log('Roles updated:', rolesUpdated);