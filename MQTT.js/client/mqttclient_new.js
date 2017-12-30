'use strict'

/** ************************** IMPORTANT NOTE ***********************************

  The certificate used on this example has been generated for a host named stark.
  So as host we SHOULD use stark if we want the server to be authorized.
  For testing this we should add on the computer running this example a line on
  the hosts file:
  /etc/hosts [UNIX]
  OR
  \System32\drivers\etc\hosts [Windows]

  The line to add on the file should be as follows:
  <the ip address of the server> stark
 *******************************************************************************/

/*
* General Setup
*/
var fs = require('fs')

/*
* Firebase Setup
*/

var admin = require('firebase-admin')
var serviceAccount = require('firebase-admin/fallsensor-dbabf-firebase-adminsdk-v7km9-9f8a81c975.json')
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://fallsensor-dbabf.firebaseio.com'
})

/*
* Messaging  with Firebase Setup
*/
const TOPIC_FALL = "Fall";
var Messaging = require('custom/messaging.js')
var _messaging = new Messaging(admin, true)

/*
* Sense Fall Setup
*/

var SenseFall = require('custom/sensefall.js')
var _senseFall = new SenseFall(false)
_senseFall.setWindowSize(30)
_senseFall.setSensitivity(32);

/*
* Sense Posture Setup
*/

var SensePosture = require('custom/sensePosture.js')
var _sensePosture = new SensePosture(false)

/*
* Util Setup
*/
var util = require('custom/util.js')

/*
* Moment Setup
*/

var moment = require('moment')
// moment().format() i.e. "2014-09-08T08:02:17-05:00" (ISO 8601)

/*
* MQTT & Kontaktio Setup
*/

var mqtt = require('mqtt')

fs.readFile('kontaktio/config.json', (err, data) => {
  if (err) throw err;
  var kt = JSON.parse(data.toString());
  
  const TOPIC_SEPERATOR = '/'
  const INDEX_SENSOR_UNIQUE_ID = 2 // e.g. /stream/[:uniqueId]/accelerometer, index is 2 after string split

//  console.log(kt.options);
  
  var options = {
    port: kt.options.port,
    host: kt.options.host,
    protocol: kt.options.protocol,
    username: kt.options.username,
    password: kt.options.password,
    clientId: 'mqttjs_' + Math.random().toString(16).substr(2, 8)
  }
  
  console.log(moment().toString() + ': Start try to connect...')
  var client = mqtt.connect(options)
  client.subscribe(kt.subscribe.streams, {qos: 2})
  
  client.on('message', function (topic, message) {
    /*
    * Split topic string e.g. /stream/[:uniqueId]/accelerometer
    * to get unique Id
    */
    var splitTopic = util.splitString(topic, TOPIC_SEPERATOR)

    if (splitTopic.length > 0 && splitTopic[INDEX_SENSOR_UNIQUE_ID] !== undefined) {
      var beaconUniqueId = splitTopic[INDEX_SENSOR_UNIQUE_ID]

      /*
      * Expected message format:
      * sensor format: {"lightLevel":53,"temperature":29}
      * health format: {"batteryLevel":100,"deviceUtcTime":1512366631,"externalPower":false}
      * accelerometer format: {"lastDoubleTap":35,"lastThreshold":21497,"x":0,"y":-1,"z":30,"sensitivity":32}
      */
      log(getCurrentDate(), beaconUniqueId, message.toString())
      
      var msgObj = util.toJsonOject(message.toString())
      var type = util.ktMessageType(msgObj)

      if (util.isKtBeaconSensor(type)) {
        // sensor values
      } else if (util.isKtBeaconHealth(type)) {
        // health values
      } else if (util.isKtBeaconAccelerometer(type)) {
        // accelerometer values
        var xVal = msgObj.x
        var yVal = msgObj.y
        var zVal = msgObj.z

        /*
        * Sense fall module
        */
        _senseFall.addData(xVal, yVal, zVal)

        /*
        * Sense Posture module
        */
        var posture = _sensePosture.getPosture(_senseFall.getWindow(), yVal)
        log(getCurrentDate(), beaconUniqueId, 'Posture is ' + posture)
//        if (_senseFall.isTriggered()) {
//          console.log('============== FALL!!! ==============')
//          _senseFall.reset();
//          
//          /*
//          * Send notification to all devices which have registered to topic "Fall"
//          */
//          var payload = _messaging.buildPayload('Alert', 'Fall detected!', {})
//          _messaging.send(TOPIC_FALL, payload)
//        }
        
      } else {
        // cant find any associate type
      }
    }
  })

  client.on('connect', function () {
    console.log(getCurrentDate() + ': Connected')
  })
  
});  

function log(dateTime, deviceId, message) {
  console.log(dateTime + ' > ' + deviceId + ': ' + message)
}

function getCurrentDate() {
  return moment().toString();
}

function getCurrentDateMs() {
  return  moment().valueOf();
}

