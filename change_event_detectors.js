/**
 * This script finds all UPDATE type event detectors and converts them to MULTISTATE_STATE detectors
 */

const UpdateDetectorVO = Java.type('com.serotonin.m2m2.vo.event.detector.UpdateDetectorVO');
const TimePeriods = Java.type('com.serotonin.m2m2.Common.TimePeriods');
const ModuleRegistry = Java.type('com.serotonin.m2m2.module.ModuleRegistry');
const MultistateStateEventDetectorDefinition = Java.type('com.serotonin.m2m2.module.definitions.event.detectors.MultistateStateEventDetectorDefinition');

const eventDetectorsService = services.eventDetectorsService;
const definition = ModuleRegistry.getEventDetectorDefinition(MultistateStateEventDetectorDefinition.TYPE_NAME);

let count = 0;

const upgradeDetector = function(detector) {
    try {
        const newDetector = definition.baseCreateEventDetectorVO(detector.getDataPoint());
        newDetector.setState(1);
        newDetector.setDuration(0);
        newDetector.setDurationType(TimePeriods.SECONDS);

        newDetector.setName(detector.getName());
        newDetector.setEditPermission(detector.getEditPermission());
        newDetector.setReadPermission(detector.getReadPermission());
        newDetector.setAlarmLevel(detector.getAlarmLevel());
        newDetector.setEventHandlerXids(detector.getEventHandlerXids());

        eventDetectorsService.insert(newDetector);
        eventDetectorsService.delete(detector);
        count++;
    } catch(e) {
        print(`Failed to upgrade detector ${detector}, error ${e}`);
    }
};

const eventDetectors = eventDetectorsService.buildQuery()
    .equal('sourceTypeName', 'DATA_POINT')
    .equal('typeName', 'UPDATE')
    .query();

for (const ed of eventDetectors) {
    if (ed instanceof UpdateDetectorVO) {
        upgradeDetector(ed);
    }
}

print(`Upgraded ${count} event detectors`);