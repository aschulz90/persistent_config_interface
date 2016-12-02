/* Magic Mirror
 * Module: module_config_interface
 *
 * By Andreas Schulz https://github.com/aschulz90
 * MIT Licensed.
 */
var NodeHelper = require('node_helper');
var path = require("path");

var persistentConfigInterface;

module.exports = NodeHelper.create({

	init: function() {
		console.log("Initializing new module helper module_config_interface");
		var app = require("./../../js/app.js");
		var configInterfaceClass = require("./ConfigInterface.js");
		app.persistentConfigInterface = new configInterfaceClass(this);
		persistentConfigInterface = app.persistentConfigInterface;
	},

	start: function () {
		console.log(this.name + ' helper started ...');
	},
  
	socketNotificationReceived: function(notification, payload) {
		
		console.log('Notification ' + notification + ' in ' + this.name + ' received: ' + JSON.stringify(payload, null, '\t'));
		
		if(notification === "INIT") {
			
		}
		else if(notification === "MODULE_ADD") {
			persistentConfigInterface.addModuleConfig(payload);
		}
		else if(notification === "MODULE_REMOVE") {
			persistentConfigInterface.removeModuleConfig(payload);
		}
		else if(notification === "MODULE_CHANGE") {
			persistentConfigInterface.replaceModuleConfig(payload.index, payload.config);
		}
    }
});