const bcrypt = require('bcryptjs');
const fs = require('fs');

async function createAdmin() {
    try {
        const username = 'admin';
        const password = 'admin123';
        const hash = await bcrypt.hash(password, 12);

        const sql = `INSERT INTO admin_users (username, password_hash, display_name, role, permissions) 
VALUES ('${username}', '${hash}', 'Administrator', 'super_admin', '{
    "canViewDashboard": true,
    "canViewBookings": true,
    "canEditBookings": true,
    "canDeleteBookings": true,
    "canManagePayments": true,
    "canViewSettings": true,
    "canEditSettings": true,
    "canManageUsers": true
}'::jsonb)
ON CONFLICT (username) DO UPDATE 
SET password_hash = '${hash}', 
    role = 'super_admin', 
    permissions = EXCLUDED.permissions;`;

        fs.writeFileSync('admin_sql.txt', sql);
        console.log('SQL written to admin_sql.txt');
    } catch (e) {
        console.error('Error:', e.message);
    }
}

createAdmin();
