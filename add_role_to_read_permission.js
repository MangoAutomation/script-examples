/*
 * This script adds a role to the read permissions for a set of data points.
 * By default it adds the user role to all points on the internal data source.
 */

// imports
const pointService = services.dataPointService;
const dataSourceService = services.dataSourceService;
const roleService = services.roleService;
const HashSet = Java.type('java.util.HashSet');
const MangoPermission = Java.type('com.infiniteautomation.mango.permission.MangoPermission');

// Set the XID of role to add here
const role = roleService.get('user').getRole();

let index = 0;
const points = pointService.buildQuery()
    // set the data source XID here
    .equal('dataSourceXid', 'internal_mango_monitoring_ds')
    .query(point => {
        const minTerms = new HashSet(point.getReadPermission().getRoles());
        const term = new HashSet();
        term.add(role);
        minTerms.add(term);

        const newPermission = new MangoPermission(minTerms);
        point.setReadPermission(newPermission);

        pointService.update(point.getXid(), point);
        log.info('Saved point {} with XID {}', index++, point.getXid());
    });
