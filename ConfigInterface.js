var path = require("path");
var configFilename = path.resolve(__dirname + "/../../config/config.js");
var fs = require('fs');

var app = require("express")();
var server = require("http").Server(app);
var io = require("socket.io")(server);

var defaultModules = require("./../default/defaultmodules.js");

// Look if the config ind config.js is parseable and if not, fix it by replacing the config with a newly serialized one
function testAndFixConfigFile() {
	fs.readFile(configFilename, 'utf8', function (err,data) {
		if (err) {
			return console.log(err);
		}
		
		var regex = new RegExp("((?:\\t|\\n|\\r|.)*?)({(?:\\t|\\n|\\r|.)*?})(;(?:\\t|\\n|\\r|.)*)");
		var index = data.search(regex);
		
		if(index >= 0) {
			var result = data.replace(regex, "$2");
			// remove comments
			result = result.replace(new RegExp("\\/\\*[\\s\\S]*?\\*\\/|([^:]|^)\\/\\/.*", 'g'), "$1");
			
			try {
				result = JSON.parse(result);
			}
			catch(e) {
				console.log("Failed to parse JSON " + e + "\nReplacing with valid one");
				// not valid json, so make it valid
				var configObject = require("./../../config/config.js");
				
				fs.writeFile(configFilename, data.replace(regex, "$1" + JSON.stringify(configObject, null, '\t') + "$3"), 'utf8', function (err) {
					if (err) {
						return console.log(err);
					}
				});
			}
		}
	});
}

function readConfigFromFile(callback) {
	fs.readFile(configFilename, 'utf8', function (err,data) {
		if (err) {
			return console.log(err);
		}
		
		var regex = new RegExp("((?:\\t|\\n|\\r|.)*?)({(?:\\t|\\n|\\r|.)*?})(;(?:\\t|\\n|\\r|.)*)");
		var index = data.search(regex);
		console.log("found config at: " + index);
		
		if(index >= 0) {
			var result = data.replace(regex, "$2");
			// remove comments
			result = result.replace(new RegExp("\\/\\*[\\s\\S]*?\\*\\/|([^:]|^)\\/\\/.*", 'g'), "$1");
			result = JSON.parse(result);
			
			if(typeof callback === "function") {
				callback(result);
			}
		}
		else {
			throw "Config not found in file!";
		}
	});
}

function writeConfigToFile(config, callback) {
	fs.readFile(configFilename, 'utf8', function (err,data) {
		
		if (err) {
			return console.log(err);
		}
		
		var regex = new RegExp("((?:\\t|\\n|\\r|.)*?)({(?:\\t|\\n|\\r|.)*?})(;(?:\\t|\\n|\\r|.)*)");
		var index = data.search(regex);
		console.log("found config at: " + index);
		
		if(index >= 0) {
			
			fs.writeFile(configFilename, data.replace(regex, "$1" + JSON.stringify(config, null, '\t') + "$3"), 'utf8', function (err) {
				if (err) {
					return console.log(err);
				}
				
				if(typeof callback === "function") {
					callback();
				}
			});			
		}
		else {
			throw "Config not found in file!";
		}
	});
}

// copied and modified from App.js, because not yet public accessible
function loadModule(module) {

	var elements = module.split("/");
	var moduleName = elements[elements.length - 1];
	var moduleFolder =  __dirname + "/../" + module;

	if (defaultModules.indexOf(moduleName) !== -1) {
		moduleFolder =  __dirname + "/../default/" + module;
	}

	var helperPath = moduleFolder + "/node_helper.js";

	var loadModule = true;
	try {
		fs.accessSync(helperPath, fs.R_OK);
	} catch (e) {
		loadModule = false;
		console.log("No helper found for module: " + moduleName + ".");
	}

	if (loadModule) {
		var Module = require(helperPath);
		var m = new Module();

		if (m.requiresVersion) {
			console.log("Check MagicMirror version for node helper '" + moduleName + "' - Minimum version:  " + m.requiresVersion + " - Current version: " + global.version);
			if (cmpVersions(global.version, m.requiresVersion) >= 0) {
				console.log("Version is ok!");
			} else {
				console.log("Version is incorrect. Skip module: '" + moduleName + "'");
				return;
			}
		}

		m.setName(moduleName);
		m.setPath(path.resolve(moduleFolder));
		return m;
	}
	
	return null;
}

class ConfigInterface {	
	
	constructor(configInterface) {
		console.log("Creating ConfigInterface with: " + configInterface);
		this.moduleName = 'module_config_interface';
		this.configInterface = configInterface;
		
		var nodeHelpers = [];
		
		this.addModule = function(name) {			
			var helper = loadModule(name);
			if(helper) {
				nodeHelpers.push(helper);
				
				helper.setExpressApp(app);
				helper.setSocketIO(io);
				helper.start();
			}
		}
		
		testAndFixConfigFile();
	}
	
	/**
     * Send a notification to the config_interface module on the client
     * @param {string} notification - The identifier of the noitication.
	 * @param {string} payload - The payload of the notification.
     */
	sendSocketNotification(notification, payload) {
		this.configInterface.sendSocketNotification(notification, payload);
	}
	
	/**
     * Return the config object via require(..)
     * @return {object} The initial config
     */
	getConfig() {
		return require(configFilename);
	}
	
	/**
     * Replaces the config of a module.
	 * @param {number|string} index - The index of the module in the module list.
	 * @param {object} config - The new config value.
	 * @param {function} [callback] - The callback to call when finished.
     */
	replaceModuleConfig(index, config, callback) {
	
		console.log("Replace module config at index " + index);
	
		if(typeof index === "string") {
			index = new Number(index);
		}
	
		if(isNaN(index)) {
			return;
		}
		
		var self = this;
		
		readConfigFromFile(function (result) {
			
			var module = result.modules[index];
			
			if(module) {
				if(config) {
					// replace
					result.modules[result.modules.indexOf(module)] = JSON.parse(config);
				}
				else {
					// remove
					result.modules.splice(result.modules.indexOf(module), 1);
				}
				
				writeConfigToFile(result, function () {
					if(config) {
						console.log("Send socket notification CONFIG_INTERFACE_REPLACED at " + index + " with " + config);
						var payload = {
							"index" : index,
							"config" : JSON.parse(config)
						}
						self.sendSocketNotification("CONFIG_INTERFACE_REPLACED", payload);
					}
					else {
						console.log("Send socket notification CONFIG_INTERFACE_REMOVED at " + index + " with " + config);
						self.sendSocketNotification("CONFIG_INTERFACE_REMOVED", index);
					}
					
					if(typeof callback === "function") {
						callback();
					}
				});
			}
		});
	}
	
	/**
     * Replaces a single value of a module.
	 * @param {number} index - The index of the module in the module list.
	 * @param {boolean} inRoot - True, if the new value is in the configs root or False if in the config attribute of the module.
	 * @param {string} valueKey - The new values name.
	 * @param {string} [newValue] - The new value.
	 * @param {function} [callback] - The callback to call when finished.
     */
	replaceModuleConfigValue(index, inRoot, valueKey, newValue, callback) {
		if(typeof index !== "number" || typeof valueKey !== "string" || !valueKey) {
			return;
		}
		
		var self = this;
		
		readConfigFromFile(function (result) {
				
			var module = result.modules[index];
			
			if(module) {
				if(newValue === null || newValue === undefined) {
					// remove
					if(inRoot) {
						delete module[valueKey];
					}
					else {
						delete module.config[valueKey];
					}
				}
				else {
					// replace
					if(inRoot) {
						module[valueKey] = newValue;
					}
					else {
						module.config[valueKey] = newValue;
					}
				}
				
				writeConfigToFile(result, function () {
					
					var payload = {};
					payload['module'] = module.module;
					payload[valueKey] = newValue;
					
					if(newValue === null || newValue === undefined) {
						self.sendSocketNotification("CONFIG_INTERFACE_REMOVED_VALUE", payload);
					}
					else {
						self.sendSocketNotification("CONFIG_INTERFACE_REPLACED_VALUE", payload);
					}
					
					if(typeof callback === "function") {
						callback();
					}
				});
			}			
		});
	}
	
	/**
     * Removes a single value of a module.
	 * @param {number} index - The index of the module in the module list.
	 * @param {boolean} inRoot - True, if the new value is in the configs root or False if in the config attribute of the module.
	 * @param {string} valueKey - The name of the value to remove.
	 * @param {function} [callback] - The callback to call when finished.
     */
	removeModuleConfigValue(index, inRoot, valueKey, callback) {
		console.log("Remove module config value at index " + index);
		this.replaceModuleConfigValue(index, inRoot, valueKey, null, callback);
	}
	
	/**
     * Removes a module from the module list.
     * @param {number} index - The index of the module in the module list.
	 * @param {function} [callback] - The callback to call when finished.
     */
	removeModuleConfig(index, callback) {
		console.log("Remove module at index " + index);
		this.replaceModuleConfig(index, null, callback);
	}
	
	/**
     * Adds a module to the module list.
	 * @param {object} config - The config of the module to add.
	 * @param {function} [callback] - The callback to call when finished.
     */
	addModuleConfig(config, callback) {
		if(typeof config !== "string") {
			return;
		}
		
		var self = this;
		
		readConfigFromFile(function (result) {
			
			var newConfig = JSON.parse(config);
			result.modules.push(newConfig);

			writeConfigToFile(result, function () {
				self.addModule(newConfig.module);
				self.sendSocketNotification("CONFIG_INTERFACE_ADDED", JSON.parse(config));
				
				if(typeof callback === "function") {
					callback();
				}
			});
		});
	}
}

module.exports = ConfigInterface;