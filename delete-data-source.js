// Delete a group of data sources read from a csv file of the form:
// id,xid
const Files = Java.type('java.nio.file.Files');

function readCsv(fileStore, filePath) {
    const path = services.fileStoreService.getPathForRead(fileStore, filePath);
    const lines = Files.readAllLines(path).toArray();
    
    const [headerLine, ...dataLines] = lines;
    const header = headerLine.split(','); 
    

    const data = dataLines.map(line => {
        const values = line.split(',');
        return header.reduce((accumulator, key, index) => {
            accumulator[key] = values[index];
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
        dataSourceService.get(ds.xid);
        dataSourceService.get(Number(ds.id));
    
        // Delete datasource
        dataSourceService.delete(ds.xid);
        count++;
    } catch(error) {
        console.log('Failed deleting data source', ds.xid, error.getMessage());
        log.error('Failed deleting data source {}', ds.xid, error);
        failed++;
    }

    if(count % 10 == 0){
        console.log(`Deleted ${count} data sources out of ${dataSourceArray.length}`);
    }
}
console.log(`Finished deleting ${count} out of ${dataSourceArray.length} data sources with ${failed} errors`);