const eventRepository       = require('./event-repository.js')
const strava                = require('strava-v3')
const moment                = require('moment')
const request               = require('request-promise');
const accessTokenRepository = require('./access-token-repository.js')
const ora                   = require('ora')
const config                = require('./config.json')

; (async () => {
  await start();
})()

async function start() {
    let stravaEvents = await getStravaEvents()
    if (stravaEvents === null)
        return
    await eventRepository.insert(stravaEvents)
    process.exit()
}

async function getStravaEvents() {
    let spinner     = ora(`Getting access token`).start()
    let accessToken = await getAccessToken()
    
    let events = null
    try
    {
        events = await strava.athlete.listActivities({'access_token':accessToken})
    }
    catch
    {
        let clientId = config.strava.clientId
        spinner.fail(`Couldn't retrieve activities from Stava`)
        console.log(`You may need to reauthenticate using the following url:`)
        console.log(`http://www.strava.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=http://www.mattdurrant.com&approval_prompt=force&scope=activity:read`)
        return null
    }

    const stravaEvents = events.map(event => ({
            name:           event.name,
            id:             event.id,
            description:    `<a href="https://www.strava.com/activities/${event.id}">${event.name} (${(event.distance / 1000).toFixed(1)}km in ${fancyTimeFormat(event.moving_time)}).</a>`,
            timestamp:      moment(event.start_date).format(),
            distance:       event.distance
        }))

    spinner.succeed(`Retrieved ${stravaEvents.length} activities from Stata.`)
    return stravaEvents
}

async function getAccessToken() {
    let clientId = config.strava.clientId
    let clientSecret = config.strava.clientSecret
    
    let data = await accessTokenRepository.get()
    if (moment() < moment.unix(data.expiresAt)) {
        return data.accessToken
    }
   
    let refreshToken = data.refreshToken
    let spinner = ora(`Access token expired at ${moment.unix(data.expiresAt)}. Attempting to get a new access token using refresh token (${refreshToken}).`).start()
    let url = `https://www.strava.com/api/v3/oauth/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=refresh_token&refresh_token=${refreshToken}`
    let response = JSON.parse(await request.post(url))
    spinner.text = `Saving new access token to database`    
    await accessTokenRepository.update(response.access_token , response.refresh_token, response.expires_at)
    spinner.text = `New access token saved to database`
    return response.access_token
}

function fancyTimeFormat(duration) {   
    // Hours, minutes and seconds
    var hrs = ~~(duration / 3600);
    var mins = ~~((duration % 3600) / 60);
    var secs = ~~duration % 60;

    // Output like "1:01" or "4:03:59" or "123:03:59"
    var ret = "";

    if (hrs > 0) {
        ret += "" + hrs + ":" + (mins < 10 ? "0" : "");
    }

    ret += "" + mins + ":" + (secs < 10 ? "0" : "");
    ret += "" + secs;
    return ret;
}
