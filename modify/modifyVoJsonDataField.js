/**
* This script will access the data field of a user to modify it
*/
const Common = Java.type('com.serotonin.m2m2.Common');
const usersService = services.usersService;



try {
    const admin = usersService.get('admin');
    if(admin.getData() == null) {
        admin.setData(Common.getBean(Java.type('com.fasterxml.jackson.databind.ObjectMapper'), Java.type('com.infiniteautomation.mango.spring.MangoRuntimeContextConfiguration').COMMON_OBJECT_MAPPER_NAME).createObjectNode())
    }
    admin.getData().put('/number', 1);
    admin.getData().put('/string', 'One');
    admin.getData().put('/emptyString', '');
    usersService.update('admin', admin);

    const editedAdmin = usersService.get('admin');
    console.log('number: ' + editedAdmin.getData().at('/number'));
    console.log('string: ' + editedAdmin.getData().at('/string'));
    console.log('emptyString: ' + editedAdmin.getData().at('/emptyString'));
    console.log('missing: ' + editedAdmin.getData().at('/missing'));

    //Test for empty node
    if(editedAdmin.getData().at('/missing').isEmpty()) {
        console.log('found missing node');
    }
}catch(error) {
    console.log(error);
}
