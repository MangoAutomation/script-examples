const users = services.usersService.buildQuery()
    .equal('organization', 'My org')
    .query();

printCsv(users, ['username', 'name', 'email']);

function printCsv(items, fields) {
    const methods = fields.map(f => 'get' + f.charAt(0).toUpperCase() + f.slice(1));
    const rows = Array.from(items).map(item => {
        return methods.map(m => item[m]());
    });
    
    response.setContentType('text/csv');
    response.setHeader('Content-Disposition', `attachment; filename="users.csv"`);
    printRow(fields);
    rows.forEach(row => printRow(row));
}

function printRow(row) {
    const quotedValues = row.map(value => {
        if (typeof value === 'string') {
            return `"${value}"`;
        }
        return value;
    });
    print(quotedValues.join(','))
}