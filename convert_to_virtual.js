downloadJson({
    dataSourceXids: ['internal_mango_monitoring_ds'],
    changeXids: true
});

/**
 * You dont need to edit below here!
 */

function downloadJson(options) {
    const result = convertToVirtual(options);
    const filename = options.dataSourceXids.join('_') + '.json';
    response.setContentType('application/json');
    response.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    print(result);
}

function convertToVirtual(options) {
    const {dataSourceXids, changeXids} = options;

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

    const dataSources = services.dataSourceService.buildQuery()
        .in('xid', ...dataSourceXids)
        .query();
    
    const dataSourceIds = Array.from(dataSources).map(ds => ds.getId());
    
    const dataPoints = services.dataPointService.buildQuery()
        .in('dataSourceId', ...dataSourceIds)
        .query();
    
    const dataTypes = {};
    for (const dp of dataPoints) {
        dataTypes[dp.getXid()] = dp.getPointLocator().getDataType().name();
    }

    const exported = services.emportService.export({
        dataSources,
        dataPoints
    }, 0);
    
    const data = JSON.parse(exported);
    
    const dsXidMap = {};
    for (const ds of data.dataSources) {
        if (changeXids) {
            const newXid = services.dataSourceService.generateUniqueXid();
            ds.xid = dsXidMap[ds.xid] = newXid;
        }
        ds.type = 'VIRTUAL';
        ds.updatePeriods = ds.updatePeriods || 1;
        ds.updatePeriodType = ds.updatePeriodType || 'MINUTES';
        ds.polling = true;
    }
    
    for (const dp of data.dataPoints) {
        const dataType = dataTypes[dp.xid];
        if (dataType === 'IMAGE') {
            throw new Error(`Datapoint ${dp.xid} has data type IMAGE which is unsupported by virtual data sources`);
        }
        if (changeXids) {
            dp.xid = services.dataPointService.generateUniqueXid();
            dp.dataSourceXid = dsXidMap[dp.dataSourceXid];
        }
        
        dp.pointLocator = POINT_LOCATORS[dataType];
        if (dataType === 'MULTISTATE' && dp.textRenderer.type === 'MULTISTATE') {
            dp.pointLocator.changeType.values = dp.textRenderer.multistateValues.map(msv => msv.key);
        }
    }
    
    return JSON.stringify(data, null, 2);
}
