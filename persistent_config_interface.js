/* Magic Mirror
 * Module: module_config_interface
 *
 * By Andreas Schulz https://github.com/aschulz90
 * MIT Licensed.
 */
 
var modulecounter = 0; 

// copied and modified from Main.js, because not yet public accessible
function bootstrapModule(module, mObj, callback) {
	Log.info("Bootstrapping module: " + module.name);

	mObj.setData(module);

	mObj.loadScripts(function() {
		Log.log("Scripts loaded for: " + module.name);
		mObj.loadStyles(function() {
			Log.log("Styles loaded for: " + module.name);
			mObj.loadTranslations(function() {
				Log.log("Translations loaded for: " + module.name);
				callback();
			});
		});
	});
};

// copied and modified from Main.js, because not yet public accessible
function getModuleData(moduleData) {
	var module = moduleData.module;

	var elements = module.split("/");
	var moduleName = elements[elements.length - 1];
	var moduleFolder =  config.paths.modules + "/" + module;

	if (defaultModules.indexOf(moduleName) !== -1) {
		moduleFolder =  config.paths.modules + "/default/" + module;
	}

	if (moduleData.disabled === true) {
		return null;
	}

	return {
		index: config.modules.length,
		identifier: "module_" + ++modulecounter + "_" + module,
		name: moduleName,
		path: moduleFolder + "/" ,
		file: moduleName + ".js",
		position: moduleData.position,
		header: moduleData.header,
		config: moduleData.config,
		classes: (typeof moduleData.classes !== "undefined") ? moduleData.classes + " " + module : module
	};
}

// copied and modified from Main.js, because not yet public accessible
function loadModule(module, callback) {
	
	if(!module) {
		callback(null);
		return;
	}
	
	var url = module.path + "/" + module.file;

	Loader.loadFile(url, module, function() {
		var moduleObject = Module.create(module.name);
		if (moduleObject) {
			bootstrapModule(module, moduleObject, function() {
				callback(moduleObject);
			});
		} else {
			callback(null);
		}
	});
};

// copied and modified from Main.js, because not yet public accessible
function createDomObject(module) {

	if (typeof module.data.position === "string") {

		var wrapper = selectWrapper(module.data.position);

		var dom = document.createElement("div");
		dom.id = module.identifier;
		dom.className = module.name;

		if (typeof module.data.classes === "string") {
			dom.className = "module " + dom.className + " " + module.data.classes;
		}

		dom.opacity = 0;
		wrapper.appendChild(dom);

		if (typeof module.data.header !== "undefined" && module.data.header !== "") {
			var moduleHeader = document.createElement("header");
			moduleHeader.innerHTML = module.data.header;
			moduleHeader.className = "module-header";
			dom.appendChild(moduleHeader);
		}

		var moduleContent = document.createElement("div");
		moduleContent.className = "module-content";
		dom.appendChild(moduleContent);

		module.updateDom(0);
		module.show(0);
		module.notificationReceived("DOM_OBJECTS_CREATED");
	}
};

// copied from Main.js, because not yet public accessible
function selectWrapper(position) {
	var classes = position.replace("_"," ");
	var parentWrapper = document.getElementsByClassName(classes);
	if (parentWrapper.length > 0) {
		var wrapper =  parentWrapper[0].getElementsByClassName("container");
		if (wrapper.length > 0) {
			return wrapper[0];
		}
	}
};

function updateModuleIndices() {
	var index = 0;
	MM.getModules().enumerate(function(module) {
		module.data.index = i++;
	});
}

// Check if we added, removed or changed a module and act accordingly
function evaluateNotification(notification, payload) {
	if(notification === "CONFIG_INTERFACE_REPLACED") {
		
		var module = MM.getModules()[payload.index];
		var oldPosition = module.data.position;
		var oldHeader = module.data.header;
		
		module.setConfig(payload.config.config);
		module.data.position = payload.config.position;
		module.data.header = payload.config.header;
		module.data.config = payload.config.config;
		
		if(oldPosition != payload.config.position || oldHeader != payload.config.header) {
			
			var dom = document.getElementById(module.data.identifier);
			
			if(dom) {
				selectWrapper(oldPosition).removeChild(dom);
			}
			
			createDomObject(module);
		}
		else {
			module.updateDom(200);
		}
	}
	else if(notification === "CONFIG_INTERFACE_REMOVED") {
		var module = MM.getModules()[payload];
		MM.getModules().splice(payload, 1);
		module.hide(200,{"lockString":this.name});
		updateModuleIndices();
	}
	else if(notification === "CONFIG_INTERFACE_ADDED") {
		loadModule(getModuleData(payload), function(module) {
			if(module) {
				config.modules.push(payload);
				MM.getModules().push(module);
				module.start();
				module.notificationReceived("ALL_MODULES_STARTED");
				createDomObject(module);
			}
		});
	}
	else if(notification === "CONFIG_INTERFACE_MODULE_HIDE") {
		var module = MM.getModules()[payload];
		module.hide(200,{"lockString":this.name});
	}
	else if(notification === "CONFIG_INTERFACE_MODULE_SHOW") {
		var module = MM.getModules()[payload];
		module.show(200,{"lockString":this.name});
	}
}

Module.register("persistent_config_interface",{

	// Module config defaults.
	defaults: {
	},

	// Define start sequence.
	start: function() {
		Log.info("Starting module: " + this.name);
		this.sendSocketNotification("INIT", "");
		modulecounter = config.modules.length;
	},
	
	/**
     * The following notifications are being processed:
	 * 'MODULE_ADD'		-	Add a new module (payload = config of the new module)
	 * 'MODULE_REMOVE'	-	Remove an exisiting module (payload = index of the module to remove)
	 * 'MODULE_CHANGE'	-	Change the WHOLE config of a module (payload = {"index": *index of the module to change*, "config": *the new config*})
	 * 'MODULE_SHOW'	-	Show a module and save it to the config (payload = index of the module to show)
	 * 'MODULE_HIDE'	-	Hide a module and save it to the config (payload = index of the module to hide)
     */
	notificationReceived: function(notification, payload) {
		
		if(notification === "MODULE_ADD" || 
				notification === "MODULE_REMOVE" || 
				notification === "MODULE_CHANGE" ||
				notification === "MODULE_SHOW" ||
				notification === "MODULE_HIDE") {
			
			console.log("Received notification: " + notification + " (" + JSON.stringify(payload, null, '\t') + ")");
			this.sendSocketNotification(notification, payload);
		}
		else if(notification === "DOM_OBJECTS_CREATED") {
			MM.getModules().enumerate(function(module) {
				if(module.config.hidden) {
					module.hide(0,{"lockString":this.name});
				}
			}.bind(this));
		}
	},
	
	socketNotificationReceived: function(notification, payload) {
		
		console.log("Received socket notification: " + notification + " (" + JSON.stringify(payload, null, '\t') + ")");
		
		evaluateNotification(notification, payload);
	},

	// Override dom generator.
	getDom: function() {
		
		var wrapper = document.createElement("div");

		return wrapper;
	}

});
