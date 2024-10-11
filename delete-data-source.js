/* Delete a group of data sources read from a csv file of the form
 * ID, XID
 *
 * Can be dounloaded from the SQL console using the query: select id, xid from datasources; 
 * Note: You can add restrictions if you don't want all datasources.
 * 
 * Instructions: 
 * 1. Run the query in the SQL console;
 * 2. Save the file to the default File Store directory with name data-source-to-delete.csv.
 * 3. Load and execute this script. 
 *
 * Note: Runs on mango 4.5.7+
 */
const Files = Java.type('java.nio.file.Files');

function readCsv(fileStore, filePath) {
    const path = services.fileStoreService.getPathForRead(fileStore, filePath);
    const lines = Array.from(Files.readAllLines(path));

    if (lines.length === 0) return [];
    
    const header = lines.shift().split(',').map(column => column.replace(/["]+/g, '').trim());

    const data = lines.map(line => {
        const row = line.split(',').map(value => value.replace(/["]+/g, '').trim());
        return header.reduce((accumulator, column, index) => {
            accumulator[column] = row[index];
            return accumulator;
        }, {});
    });

    return data;
}

const dataSourceService = services.dataSourceService;
const dataSourceArray = readCsv('default', 'data-source-to-delete.csv');

console.log(`Deleting ${dataSourceArray.length} data sources`);
let count = 0;
let failed = 0;
for(const ds of dataSourceArray) {
    try {
        // Validations
        dataSourceService.get(ds.XID);
        dataSourceService.get(Number(ds.ID));
    
        // Delete datasource
        dataSourceService.delete(ds.XID);
        count++;
    } catch(error) {
        console.log('Failed deleting data source', ds.XID, error.getMessage());
        log.error('Failed deleting data source {}', ds.XID, error);
        failed++;
    }

    if(count % 10 == 0){
        console.log(`Deleted ${count} data sources out of ${dataSourceArray.length}`);
    }
}
console.log(`Finished deleting ${count} out of ${dataSourceArray.length} data sources with ${failed} errors`);