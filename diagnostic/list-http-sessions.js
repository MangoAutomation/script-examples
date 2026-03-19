const MangoSessionRegistry = Java.type('com.serotonin.m2m2.web.mvc.spring.security.MangoSessionRegistry');
const MangoWebApplicationInitializer = Java.type('com.infiniteautomation.mango.webinit.MangoWebApplicationInitializer');

const webContext = runtimeContext.getBean(MangoWebApplicationInitializer.class).getWebAppContext();
const sessionRegistry = webContext.getBean(MangoSessionRegistry.class);
const principals = sessionRegistry.getAllPrincipals();

const sessions = [];

for (const principal of principals) {
    const sessionInfoList = sessionRegistry.getAllSessions(principal, false); // false = exclude expired
    for (const info of sessionInfoList) {
        const user = info.getPrincipal();
        sessions.push({
            username: user.getUsername ? user.getUsername() : String(user),
            userId: user.getId ? user.getId() : null,
            sessionId: info.getSessionId(),
            lastRequest: new Date(info.getLastRequest().getTime()).toISOString(),
            expired: info.isExpired()
        });
    }
}

print('Active HTTP Sessions: ' + sessions.length);
print('');
sessions.forEach((s, i) => {
    print(`Session ${i + 1}:`);
    print(`  Username:     ${s.username}`);
    print(`  User ID:      ${s.userId}`);
    print(`  Session ID:   ${s.sessionId}`);
    print(`  Last Request: ${s.lastRequest}`);
    print(`  Expired:      ${s.expired}`);
    print('');
});
