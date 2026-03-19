/**
 * Queries and exports data points from the 'Mango Internal' device as JSON.
 */
const dataPoints = services.dataPointService.buildQuery()
    .equal('deviceName', 'Mango Internal')
    .isNull('tags.site')
    .query(2, 0); // limit, offset

const exported = services.emportService.export({
    dataPoints
}, 4);

print(exported);
