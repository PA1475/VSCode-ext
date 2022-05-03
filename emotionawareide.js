const vscode = require('vscode');

class EmotionAwareIDE {
	constructor() {
		this.server_commands = {};
		this.action_commands = {};
		this.user_settings = {};
	}

	get activeActions() {
		let EID = "emotionawareide"
		let active_actions = "";
		for (const key in this.user_settings) {
			if (vscode.workspace.getConfiguration(EID).get(key) == true) {
				if (this.user_settings[key]["act"] != undefined) {
					if (active_actions != "")
						active_actions += " ";
					active_actions += this.user_settings[key]["act"]
				}
			}
		}
		return active_actions;
	}

	addServerCommand(cmd_name, func) {
		// cmd_name is same as given in server
		this.server_commands[cmd_name] = func;
	}

	addActionCommand(action_name, func) {
		// action_name is same as given in server
		this.action_commands[action_name] = func;
	}

	addSettingEvent(setting_name, func, act=undefined) {
		// settings_name is same name as given in package.json
		// (Excluding emotionawareide), action is the same as in server
		this.user_settings[setting_name] = {"func" : func, "act" : act};
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
		for (const key in this.user_settings){
			if (e.affectsConfiguration("emotionawareide."+key)){
				this.user_settings[key]["func"](
					vscode.workspace.getConfiguration("emotionawareide").get(key)
				);
				break;
			}
		}
	}
}
module.exports = EmotionAwareIDE;