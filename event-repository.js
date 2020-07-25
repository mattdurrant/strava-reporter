const mysql = require('mysql2/promise')
const config = require('./config.json')

async function insert(stravaEvents) {
    const connection = await mysql.createConnection({
        host: config.mysql.host,
        port: config.mysql.port,
        user: config.mysql.user,
        password: config.mysql.password,
        database: config.mysql.database    
      })

    for (let i = 0; i < stravaEvents.length; i++) {
        await connection.query(`INSERT INTO homepage.events (timestamp, details, type_ind) VALUES ('${stravaEvents[i].timestamp}', '${stravaEvents[i].description}', 'strava') ON DUPLICATE KEY UPDATE details = '${stravaEvents[i].description}'`)
    }
}

module.exports = {
    insert
}
