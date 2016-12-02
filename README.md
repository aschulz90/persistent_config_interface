# persistent_config_interface

This is a [MagicMirror](https://github.com/MichMich/MagicMirror) module for making persistent changes to MagicMirrors config file.

##Video:

[![IMAGE ALT TEXT HERE](https://img.youtube.com/vi/hUUipBgShb4/0.jpg)](https://www.youtube.com/watch?v=hUUipBgShb4)

!The used app is not part of this project and will be released later!

## Installation

1. Navigate into your MagicMirror's `modules` folder.
2. Clone repository with `git clone https://github.com/aschulz90/persistent_config_interface.git`.

## Usage

### Config

Add this to your `config.js`

```javascript
{
    "module": 'persistent_config_interface'
}
```

### Serverside

```javascript
var persistentConfigInterface = require("./../../js/app.js").persistentConfigInterface;

// add a new module
var newModule = {"module": "calendar"};
persistentConfigInterface.addModuleConfig(newModule);

// change an exisiting module
var moduleIndex = 0; // equals the index of the module in the persistentConfigInterface.getConfig().modules array
newModule.position = "top_left";
persistentConfigInterface.replaceModuleConfig(moduleIndex, newModule);

// remove an exisiting module
persistentConfigInterface.removeModuleConfig(moduleIndex);
```


### Clientside

inside a module function

```javascript
// add a new module
var newModule = {"module": "calendar"};
this.sendNotification("MODULE_ADD", newModule);

// change an exisiting module
var moduleIndex = 0; // equals the index of the module in the config.modules array
newModule.position = "top_left";
this.sendNotification("MODULE_CHANGE", {"index": moduleIndex, "config": newModule});

// remove an exisiting module
this.sendNotification("MODULE_REMOVE", moduleIndex);
```
