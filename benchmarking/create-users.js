/**
 * Create a user and 2 roles to use in benchmarking
 */
 
// import classes
const Common = Java.type('com.serotonin.m2m2.Common');
const User = Java.type('com.serotonin.m2m2.vo.User');
const RoleVO = Java.type('com.serotonin.m2m2.vo.role.RoleVO');
const HashSet = Java.type('java.util.HashSet');
const Arrays = Java.type('java.util.Arrays');

// import services
const usersService = services.usersService;
const roleService = services.roleService;

//Create benchmark-read role
let benchmarkRead;
try {
  benchmarkRead = roleService.get('BENCHMARK_READ');
}catch(error) {
  //Assume we are not found and insert
  benchmarkRead = new RoleVO(Common.NEW_ID, 'BENCHMARK_READ', 'Benchmark read');
  roleService.insert(benchmarkRead);
}
//Create benchmark-edit role
let benchmarkEdit;
try {
  benchmarkEdit = roleService.get('BENCHMARK_EDIT');
}catch(error) {
  //Assume we are not found and insert
  benchmarkEdit = new RoleVO(Common.NEW_ID, 'BENCHMARK_EDIT', 'Benchmark edit');
  roleService.insert(benchmarkEdit);
}

//Create User
try {
    usersService.get('non-admin-benchmark');
}catch(error) {
    const nonAdmin = new User();
    nonAdmin.setName('non admin benchmark');
    nonAdmin.setUsername('non-admin-benchmark');
    nonAdmin.setPassword('{PLAINTEXT}benchmark');
    nonAdmin.setEmail('benchmark@test.com');
    nonAdmin.setRoles(new HashSet(Arrays.asList(benchmarkRead.getRole(), benchmarkEdit.getRole())));
    
    usersService.insert(nonAdmin);
}

