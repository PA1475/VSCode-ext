const vscode = require('vscode');

class EmotionAwareIDE {
	constructor() {
		this.server_commands = {};
		this.action_commands = {};
		this.setting_event = {};
		this.activation_event = {};
		this.edit_event = {};
	}

	activateActions() {
		let EID = "emotionawareide";
		for (const key in this.activation_event) {
			if (vscode.workspace.getConfiguration(EID).get(key)) {
				this.activation_event[key](true);
			}
		}
	}

	actionSetup() {
		let EID = "emotionawareide";
		for (const key in this.edit_event) {
			let parameter = vscode.workspace.getConfiguration(EID).get(key);
			this.edit_event[key](parameter);
		}
	}

	addServerCommand(cmd_name, func) {
		// cmd_name is same as given in server
		this.server_commands[cmd_name] = func;
	}

	addActionCommand(action_name, func) {
		// action_name is same as given in server
		this.action_commands[action_name] = func;
	}

	addSettingEvent(setting_name, func) {
		this.setting_event[setting_name] = func;
	}

	addActivationEvent(setting_name, func) {
		// settings_name is same name as given in package.json
		// (Excluding emotionawareide), action is the same as in server
		this.setting_event[setting_name] = func;
		this.activation_event[setting_name] = func;
	}

	addEditEvent(setting_name, func) {
		this.setting_event[setting_name] = func;
		this.edit_event[setting_name] = func;
	}

	async handleAction(data_str) {
		// Calls desired function with a string of commands
		// as parameter
		let sep = data_str.search(" ");
		let action_name = data_str.substring(0, sep);
		if (sep == -1)
			action_name = data_str;
		if (action_name in this.action_commands) {
			await this.action_commands[action_name](
				data_str.substring(sep+1, data_str.length)
				);
		}
	}

	handleData(data) {
		// Calls desired function with a string of commands
		// as parameter, if an action: call desired action command
		let message = data;
		let sep = message.search(" ");
		if (sep == -1) {
			throw "A command must have atleast two arguments"+
			      " separated with a space";
		}
		let cmd = message.substring(0, sep);
		if (cmd == "ACT") {
			this.handleAction(message.substring(sep+1, message.length));
		
		} else if (cmd in this.server_commands){
			this.server_commands[cmd](message.substring(sep+1, message.length));
		}
	}

	onSettingChange(e) {
		for (const key in this.setting_event){
			if (e.affectsConfiguration("emotionawareide."+key)){
				this.setting_event[key](
					vscode.workspace.getConfiguration("emotionawareide").get(key)
				);
				break;
			}
		}
	}
}
module.exports = EmotionAwareIDE;