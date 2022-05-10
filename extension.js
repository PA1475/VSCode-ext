
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
//const { once } = require('events');
const vscode = require('vscode');
const net = require('net');
const { write } = require('fs');
const { privateEncrypt } = require('crypto');

const GIT_HOOK_SCRIPT = "#!/bin/sh\nFILE=$1\nMESSAGE=$(cat $1)\nlines=`wc -l .git/logs/HEAD | awk '{print $1;}'`\nAUTHOR=`git config user.name`\nTIMESTAMP=`git log --author=\"$AUTHOR\" -1 --format=%ct`\nINPUT=\"emotions.csv.tmp\"\ncurl -o $INPUT \"127.0.0.1:8050/assets/emotions.csv\" 2>/dev/null\nTMP=(0 0 0 0)\nwhile IFS=\",\" read -r TIME EMOT\ndo\nTMP1=${EMOT%.*}\nTMP2=${TIME%.*}\nif [ \"$TMP1\" != \"emotions\" ]\nthen\nif [ $TMP2 -gt $TIMESTAMP ]\nthen\n((TMP[(($TMP1-1))]++))\nfi\nfi\ndone < $INPUT\nBIG=${TMP[0]}\nINDEX=0\nSUM=0\nfor i in {0..3}\ndo\nSUM=$((TMP[$i]+$SUM))\nif [ ${TMP[$i]} -gt $BIG ]\nthen\nBIG=${TMP[$i]}\nINDEX=$i\nfi\ndone\nrm $INPUT\nEMOTION=\" \"\nif [ $INDEX = 0 ]\nthen\nEMOTION=\"😰\"\nfi\nif [ $INDEX = 1 ]\nthen\nEMOTION=\"😃\"\nfi\nif [ $INDEX = 2 ]\nthen\nEMOTION=\"😞\"\nfi\nif [ $INDEX = 3 ]\nthen\nEMOTION=\"😐\"\nfi\nCERT=$((100 * $BIG/$SUM))\necho \"$MESSAGE\n\n$EMOTION $CERT%\" > $FILE"

let statusbar_item;
let e4_statusbar;
let eye_statusbar;

let server_connected = false;
let e4_connected = false;
let eye_connected = false;
let baseline = false;

const SUCCESS_STR = "SUCC"
const FAIL_STR = "FAIL"


function displayMessage(message) {
	// displays message as popup
	vscode.window.showInformationMessage(message);
}


async function addGitHook() {
	let rootFolder = vscode.workspace.workspaceFolders[0].uri;
	let gitfolder = vscode.Uri.joinPath(rootFolder, ".git");
	try {
		let res = await vscode.workspace.fs.readDirectory(gitfolder);
		let githook = vscode.Uri.joinPath(gitfolder, "hooks/commit-msg");
		try {
			res = await vscode.workspace.fs.stat(githook);
		} catch(e) {
			let answer = await vscode.window.showInformationMessage("It seems this is a git project, would you like to add the git hook?", "Yes", "No");
			if (answer == "Yes") {
				await vscode.workspace.fs.writeFile(githook, Buffer.from(GIT_HOOK_SCRIPT), {create: true, overwrite: false});
			}
		}
	} catch(e) {}
}


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "emotionawareide" is now active!');
	
	addGitHook();

	// The command has been defined in the package.json file
	let disposable = vscode.commands.registerCommand('emotionawareide.start_dashboard', show_web_view);

	// pushes command to context
	context.subscriptions.push(disposable);

	var client = new net.Socket();
	client.on("error", (err) =>{
		displayMessage("Could not connect to server, check port and try again.")
	});
	client.on('data', (data) => {
		handle_data(data);
	});

	// pushes command to context
	context.subscriptions.push(vscode.commands.registerCommand('emotionawareide.show_message', async () => {

		// gets message from user input
		if (server_connected)
		{
			// runs displaymessage with message
			// displayMessage(message);
			let message = await vscode.window.showInputBox({
				placeHolder: "Write a message"
			});
			client.write(to_msg(message));
		}

	}));

	function connect_eyetracker(){
		if (server_connected){
			const eyetracker_port = vscode.workspace.getConfiguration('emotionawareide').get('eye.port');
			client.write(to_msg(`ONEY ${eyetracker_port.toString()}`));
		} else 
		{
			displayMessage("Server needs to be connected first.")
			eye_statusbar.text = "$(eye)EYE";
		}
	}

	function disconnect_eyetracker(){
		if (server_connected && eye_connected){
			client.write(to_msg("OFEY"));
		}
	}

	context.subscriptions.push(vscode.commands.registerCommand('emotionawareide.connect_eyetracker', connect_eyetracker));


	function connect_e4 (){
		if (server_connected){
			const e4_port = vscode.workspace.getConfiguration('emotionawareide').get('e4.port');
			client.write(to_msg(`CE4 ${e4_port.toString()}`));
		} else {
			displayMessage("Server needs to be connected first.");
			e4_statusbar.text = "$(watch)E4";
		}
	}

	function disconnect_e4 (){
		if (server_connected && e4_connected)
		{
			client.write(to_msg("DE4"));
		}
	}
	context.subscriptions.push(vscode.commands.registerCommand('emotionawareide.connect_e4', connect_e4));

	function connect_to_server() {
		if (!server_connected) {
			const server_port = vscode.workspace.getConfiguration('emotionawareide').get('server.port');
			let could_connect = false;
			client.connect(server_port, '127.0.0.1', () => {
				console.log('Connected');
				could_connect = true;
				server_connected = true;
				console.log(could_connect);
				client.write(to_msg("SBL"));
			});
			// on data received run function
		}
	}
	context.subscriptions.push(vscode.commands.registerCommand('emotionawareide.connect_server', connect_to_server));
	connect_to_server();

	function to_msg(msg) {
		return msg +"\t\n";
	}

	// cmd

	function emotion_to_emoji(index)
	{
		let emoji = "";
		switch(index)
		{
			case 1:
				emoji = "😰";
				break;
			case 2:
				emoji = "😃";
				break;
			case 3:
				emoji = "😞";
				break;
			case 4:
				emoji = "😐";
				break;
		}
		return emoji;
	}


	async function handle_actions(act_data)
	{
		let complete_msg = "";
		let sep = act_data.search(" ");
		let act_name = act_data.substring(0, sep);
		switch (act_name)
		{
			case "TEST":
				let message = await vscode.window.showInputBox({
					placeHolder : "Write response to TEST"
				});
				complete_msg = "ACT TEST " + message;
				client.write(to_msg(complete_msg));
				break;
			case "SRVY":
				let result = await show_survey();
				console.log(result);
				complete_msg = "ACT SRVY " + result;
				client.write(to_msg(complete_msg));
				break;
			case "BRK":
				if (data_arr[1] == "take_break") {
					vscode.window.showInformationMessage("Maybee its time to take a break? ☕️");
				} else {
					vscode.window.showInformationMessage("Continue working!");
				}
				break;
			case "ESTM":
				let data_arr = act_data.split(" ");
				let pred_index = parseInt(data_arr[1]);
				let pred_certainty = data_arr[2];
				complete_msg = `I believe you are: ${emotion_to_emoji(pred_index)}, with ${pred_certainty}% certainty.`;
				update_statusbar_label(emotion_to_emoji(pred_index));
				displayMessage(complete_msg);
				break;
		}
	}

	function servername_to_name(s_name){
		let name = "";
		switch (s_name)
		{
			case "SRVY":
				name = "survey";
				break;
			case "ESTM":
				name = "estimate";
				break;
			case "BRK" :
				name = "takeBreak";
				break;
			case "STUCK":
				name = "stuck";
				break;
		}
		return name;
	}


	function handle_data(data){
		let message = data.toString();
		console.log(message);
		let sep = message.search(" ");
		let cmd = message.substring(0, sep);
		switch (cmd){
			case "ACT":
				handle_actions(message.substring(sep+1, message.length));
				break;
			case "CE4":
				message = message.substring(sep+1, message.length);
				e4_statusbar.text = "$(watch)E4";
				if (message == FAIL_STR)
					displayMessage(
						"Could not connect to E4, check the E4 "+
						"manager app and port.")
					else {
						e4_connected = true;
						e4_statusbar.color = "#42f551";
						client.write(to_msg(get_active_actions()));
					}
				break;
			case "DE4":
				e4_connected = false;
				e4_statusbar.text = "$(watch)E4";
				e4_statusbar.color = undefined;
				displayMessage("E4 disconnected.");
				break;
			case "SBL":
				let sbl_data = message.split(' ');
				if (sbl_data[1] == "SUCC")
					displayMessage("Baseline set, ready for development.");
				else {
					displayMessage("New Baseline needs to be created.")
				}
				break;
			case "ONEY":
				let oney_str = message.substring(sep+1, message.length);
				eye_statusbar.text = "$(eye)EYE";
				if (oney_str == FAIL_STR)
					displayMessage(
						"Could not connect to Eyetracker. Make sure "+
						"GazePoint control is active or the port in "+
						"settings corresponds to the correct port.");
				else {
					eye_connected = true;
					eye_statusbar.color = "#42f551";
					client.write(to_msg(get_active_actions()));	
				}
				break;
			case "OFEY":
				eye_statusbar.text = "$(eye)EYE";
				eye_connected = false;
				eye_statusbar.color = undefined;
				displayMessage("Eyetracker disconnected.");
				break;
			case "DACT":
				let dact_str = message.substring(sep+1, message.length);
				let dact_cmd = dact_str.split(" ");
				if (dact_cmd[0] == "FAIL")
				{
					for (let i = 1; i < dact_cmd.length; i++)
					{
						let name = servername_to_name(dact_cmd[i]);
						console.log(`actions.${name}`)
						vscode.workspace.getConfiguration("emotionawareide").update(`actions.${name}`, false);
					}
					displayMessage("Could not activate all desired actions.");
				}
				break;
			case "ERR":
				displayMessage(message);
				break;
		}
	}
  
	// context.subscriptions.push(vscode.commands.registerCommand('emotionawareide.start_survey', start_survey));


	vscode.commands.registerCommand("show_web_view", show_web_view);
	statusbar_item = vscode.window.createStatusBarItem(1, 1);
	statusbar_item.command = "show_web_view";
	statusbar_item.show();


	function e4_connection () {
		console.log(e4_connected);
		if (e4_connected == false) {
			e4_statusbar.text = "$(watch)$(sync~spin)"
			connect_e4();
		} else {
			disconnect_e4();
		}
	}
	vscode.commands.registerCommand("e4_connection", e4_connection);
	e4_statusbar = vscode.window.createStatusBarItem(1,1);
	e4_statusbar.command = "e4_connection";
	e4_statusbar.text = "$(watch)E4";
	e4_statusbar.show();

	function eye_connection (){
		if (eye_connected == false) {
			eye_statusbar.text = "$(eye)$(sync~spin)";
			connect_eyetracker();
		} else {
			disconnect_eyetracker();
		}
	}
	vscode.commands.registerCommand("eye_connection", eye_connection);
	eye_statusbar = vscode.window.createStatusBarItem(1,1);
	eye_statusbar.command = "eye_connection";
	eye_statusbar.text = "$(eye)EYE";
	eye_statusbar.show();

	// port used for communication
	const port1 = vscode.workspace.getConfiguration('emotionawareide').get('server.port');
	console.log(port1);

	// initialize client
	// var client = new net.Socket();

	// // connect client
	// client.connect(port1, '127.0.0.1', () => {
	// 	console.log('Connected');
	// });

	// // on data received run function
	// client.on('data', (data) => {
	// 		handle_data(data);
	// });

	function get_active_actions() {
		let activate_str = "AACT";
		if (vscode.workspace.getConfiguration("emotionawareide").get("action.survey"))
			activate_str += " SRVY";
		if (vscode.workspace.getConfiguration("emotionawareide").get("action.takeBreak"))
			activate_str += " BRK";
		if (vscode.workspace.getConfiguration("emotionawareide").get("action.estimate"))
			activate_str += " ESTM";
		if (vscode.workspace.getConfiguration("emotionawareide").get("action.stuck"))
			activate_str += " STUCK";
		return activate_str;
	}

	vscode.workspace.onDidChangeConfiguration((e) => {
		if (e.affectsConfiguration("emotionawareide.server.port")) {
			console.log(`Connecting ${client.connecting}`);
		} 
		if (!server_connected)
			return;

		if (e.affectsConfiguration("emotionawareide.e4.port")) {
				connect_e4();
		}
		else if (e.affectsConfiguration("emotionawareide.eye.port")) {
				connect_eyetracker();
		}
		else if (e.affectsConfiguration("emotionawareide.action.survey")) {
			let toggled = vscode.workspace.getConfiguration("emotionawareide").get("action.survey");
			let server_msg = "DACT SRVY";
			if (toggled){
				server_msg = "AACT SRVY";
			}
			client.write(to_msg(server_msg));
		}
		else if (e.affectsConfiguration("emotionawareide.action.estimate")) {
			let toggled = vscode.workspace.getConfiguration("emotionawareide").get("action.estimate");
			let server_msg = "DACT ESTM";
			if (toggled){
				server_msg = "AACT ESTM";
			}
			client.write(to_msg(server_msg));
		}
		else if (e.affectsConfiguration("emotionawareide.action.takeBreak")) {
			let toggled = vscode.workspace.getConfiguration("emotionawareide").get("action.takeBreak");
			let server_msg = "DACT BRK";
			if (toggled){
				server_msg = "AACT BRK";
			}
			client.write(to_msg(server_msg));
		}
		else if (e.affectsConfiguration("emotionawareide.action.stuck")) {
			let toggled = vscode.workspace.getConfiguration("emotionawareide").get("action.stuck");
			let server_msg = "DACT STUCK";
			if (toggled){
				server_msg = "AACT STUCK";
			}
			client.write(to_msg(server_msg));
		}
			
	});

}


function update_statusbar_label(_label) {
	statusbar_item.text = _label;
}


function show_web_view() {
	// creates a webview
	const panel = vscode.window.createWebviewPanel(
		"dashboard",
		"Dashboard",
		vscode.ViewColumn.One,
		{
			enableScripts: true
		}
	);

	// gets the html to display
	panel.webview.html = getWebviewContent();
}

function emoji_to_emotion(emoji)
{
	let emotion = 0;
	switch(emoji)
	{
		case "😰":
			emotion = 1;
			break;
		case "😃":
			emotion = 2;
			break;
		case "😞":
			emotion = 3;
			break;
		case "😐":
			emotion = 4;
			break;
	}
	return emotion;
}


async function show_survey() {
	res_mood = await vscode.window.showInformationMessage("How are you feeling?", "😰", "😞", "😐", "😃");
	let result = emoji_to_emotion(res_mood);
	return result;
}



function getWebviewContent() {
	// returns html as a iframe
	return `<!DOCTYPE html>
	<html>
	  
	<head>
		<title>full screen iframe</title>
		<style type="text/css">
			html {
				overflow: auto;
			}
			  
			html,
			body,
			div,
			iframe {
				margin: 0px;
				padding: 0px;
				height: 100%;
				border: none;
			}
			  
			iframe {
				display: block;
				width: 100%;
				border: none;
				overflow-y: auto;
				overflow-x: hidden;
			}
		</style>
	</head>
	  
	<body>
		<iframe src="http://localhost:8050"
				frameborder="0" 
				marginheight="0" 
				marginwidth="0" 
				width="100%" 
				height="100%" 
				scrolling="auto">
	  </iframe>
	  
	</body>
	  
	</html>`;
}


function convert_message(data) {
	let str = "";
	//str += "FPOGX: " + String(byteToFloat(data.slice(0,4)));
	//str += ", FPOGY: " + String(byteToFloat(data.slice(4,8)));
	let arousal = "LOW";
	if (data[8] == 1)
	{
		arousal = "HIGH";
	}
	str += "Arousal: " + arousal + ", Certanty: " + String(byteToFloat(data.slice(9,13)));
	str += "\n"
	let valence = "LOW";
	if (data[13] == 1)
	{
		valence = "HIGH";
	}
	str += "Valence: " + valence + ", Certanty: " + String(byteToFloat(data.slice(14, 18)));
	return str;
}
function getVisibleText() {
    // finds top and bottom lines currently visible on texteditor

    visRanges = vscode.window.activeTextEditor.visibleRanges;
    low = visRanges[0]["_start"]["_line"]
    high = visRanges[0]["_end"]["_line"]
    console.log("Current top line " + low);
    console.log("Current bottom line " + high);
    const range = new vscode.Range(low, 0, high, 0);
    const ranges = vscode.window.activeTextEditor.document.getText(range)
    const stuckText = vscode.window.activeTextEditor.document.fileName;
    vscode.window.showInformationMessage(stuckText,ranges);
}


function byteToFloat(data) {
    // Create a buffer
    let buf = new ArrayBuffer(4);
    // Create a data view of it
    let view = new DataView(buf);

    // set bytes
    data.forEach(function (b, i) {
       view.setUint8(i, b);
    });

    // Read the bits as a float; note that by doing this, we're implicitly
    // converting it from a 32-bit float into JavaScript's native 64-bit double
    let num = view.getFloat32(0, true);
    return num;
}


// this method is called when your extension is deactivated
function deactivate() {
	console.log("Shutting down")
	let END_STREAM = "END END_SERVER";
	client.write(to_msg(END_STREAM));
	client.close();

}

module.exports = {
activate,
deactivate
}
