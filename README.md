# emotionawareide README

## How do I add a new command in the command palette?
To add a new command to the command palette you have to add it's entry in the file **package.json** in the **commands** section the entry is structured like
```json
{
    "command": "command to run goes here",
    "title": "The name displayed in the command palette goes here"
}
```

To supply the command that the is run we must specify in the **extenstion.js** file
```js
context.subscriptions.push(vscode.commands.registerCommand("same name supplied as the command in the json file goes here", "The function to goes here"));
```
## Using the Extension
This section is dedicated to the Extension from a User perspective. OBS! The E4 Streaming Server sometimes have problems transmitting data, if this happens an action will detect it and let the user know. Restarting the E4 Streaming App should solve the problem.
### Settings
In the settings menu (File->Preferences->Settings->EmotionAwareIde), different settings can be edited. For example, changing ports for the different servers/devices and activating/editing **Actions**. Actions are the user visible features and the settings menu provides an easy way to handle them.
### Statusbar features
In the VSCode statusbar there are three buttons. 
1. The E4 button. If the E4 is not connected an attempt is made to connect to the E4 streaming server with the port from the settings. If the E4 is already connected (button is green) a notification is displayed with the options to record a new baseline or to disconnect the device.
2. The EYE button. If the Eyetracker is not connected an attempt is made turn on the eyetracker on the port from the settings. If the Eyetracker is already connected (button is green) a notification is displayed with the options to recalibrate the eyetracker or disconnect the device. (OBS! Turning on the eyetracker takes about one minute)
3. The dashboard button. Represented by an emoji with the users' current mood (if the E4 is not connected the emoji is set to "😐"). When pressing the button a webview is shown with the Dashboard.
### Baseline
If there is no Baseline set, no actions is going to turn on until the user has recorded a new one. Local baselines will loaded automatically during the initial connection step to the python Server.

## Keep building on the project
This section is dedicated to important funcitons and knowledge needed to contribute to the project.
### Handling server commands
All communication between the python server and the VSCode extension is done with string commands through sockets.
For example, the command "CE4 28000" tries to connect to the E4 Streaming server on the 28000 port. (For other commands check out the python README).
#### Sending messages to server
Sending messages to the server is done with the client.write method. OBS! All commands sent via the socket must end with "\r\n". For simplicity's sake the function to_msg can be used which appends "\r\n" to the string.
When responding to a message from an action the string format "ACT *action name* *message*\r\n" is used.
When sending a message to the server the string format "*server command* *message*\r\n" is used.
#### Receiving messages from server
There are several functions used for recieval of messages from the server and they all are stored inside the **emoide** class. Retrieving server messages is done with the function:
``` js
emoide.addServerCommand("Server command", function(message));
```
For example after trying to connect to the E4 with the *CE4 28000* command, the python server will respond with the string *CE4 SUCC*. The *CE4* is the server command and everything after *CE4* is the message, in this case *SUCC*.
If a message is sent from an action the following funciton will catch the message:
```js
emoide.addActionCommand("Action name", function(message));
```
Where the action name is the name set in the corresponding class (check python server README).
### Package.json settings
To add more user settings simply follow the vscode api documentation for how package.json works.
Right now there are four sections in the settings: Server, E4, Eye tracker and actions.
### Handling setting events
There are three functions which can be used together with the package.json settings. All the functions below will be called when a setting is changed.
#### addSettingEvent
This event will only trigger when a setting is changed. A setting event will not be called when starting the server or a device is connected.
```js
emoide.addSettingEvent("setting path", function(change));
```
The following funciton will be called when the server port is changed:
```js
emoide.addSettingEvent("server.port", (port) => {console.log(`port changed to ${port}.`);});
```
#### addActivationEvent
This event is meant for the settings that activates actions (optional: ends with activate). The funcitons added to this setting type will be called when the server is connected, a new device is connected and the baseline is set. The toggled variable will be either true or false if used together with the package.json type "boolean".
```js
emoide.addActivationEvent("setting path", function(toggled));
```
The following function will be called when the takeBreak action is activated:
```js
emoide.addActivationEvent("action.takeBreak.activate", (toggled) => {console.log(`Action Take Break is set to ${toggled}`);});
```
#### addEditEvent
This event is meant for editing action settings (see python server README). This setting will also be called when the extension connects to the python server for the first time. The change parameter differs from setting to setting.
```js
emoide.addEditEvent("setting path", function(change));
```
The following function is called when the user want to change the time between surveys:
```js
emoide.addEditEvent("action.survey.time", (change)=>{console.log(console.log(`Survey now polls every ${change} minutes.`);});
```
When the different functions are called:
|   **Functions**  |**Setting changed**|**Server startup**|**Device connected**|
|------------------|-------------------|------------------|--------------------|
|  addSettingEvent |         X         |                  |                    |
|   addEditEvent   |         X         |         X        |                    |
|addActivationEvent|         X         |         X        |          X         |

