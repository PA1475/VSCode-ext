
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
//const { once } = require('events');
const vscode = require('vscode');
const net = require('net');
const { write } = require('fs');

let statusbar_item;
let e4_statusbar;
let eye_statusbar;

let server_connected = false;
let e4_connected = false;
let eye_connected = false;
let baseline = false;

SUCCESS_STR = "SUCC"
FAIL_STR = "FAIL"


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "emotionawareide" is now active!');

	// The command has been defined in the package.json file
	let disposable = vscode.commands.registerCommand('emotionawareide.start_dashboard', show_web_view);

	// pushes command to context
	context.subscriptions.push(disposable);

	var client = new net.Socket();

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
	

	function server_setup () {
		client.write(to_msg("SBL"))
	}
	connect_to_server();
	function connect_to_server() {
		const server_port = vscode.workspace.getConfiguration('emotionawareide').get('server.port');
		console.log(server_port);
		// connect client
		try{
			client.connect(server_port, '127.0.0.1', () => {
				console.log('Connected');
				server_connected = true;
				server_setup();
			});
	
			// on data received run function
			client.on('data', (data) => {
					handle_data(data);
			});
		} catch (error){
			server_connected = false;
			displayMessage(
				"Could not connect to server. Make sure the " +
				"server process is on and the port is correct.")
		}
	}
	context.subscriptions.push(vscode.commands.registerCommand('emotionawareide.connect_server', connect_to_server));


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
				complete_msg = "ACT SRVY " + result;
				client.write(to_msg(complete_msg));
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
						e4_statusbar.color = "#009900";
					}
				displayMessage(message);
				break;
			case "DE4":
				e4_connected = false;
				e4_statusbar.text = "$(watch)E4";
				e4_statusbar.color = undefined;
				displayMessage("E4 disconnected.");
				break;
			case "SBL":
				displayMessage(message);
				break;
			case "ONEY":
				let oney_str = message.substring(sep+1, message.length);
				eye_statusbar.text = "$(eye)EYE";
				if (oney_str == FAIL_STR)
					displayMessage(
						"Could not connect to Eyetracker. Make sure "+
						"GazePoint control is active or the port in "+
						"settings corresponds to the correct port.")
				else {
					eye_connected = true;
					eye_statusbar.color = "#009900";
				}
				break;
			case "OFEY":
				eye_statusbar.text = "$(eye)EYE";
				eye_connected = false;
				eye_statusbar.color = undefined;
				displayMessage("Eyetracker disconnected.");
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


function displayMessage(message) {
	// displays message as popup
	vscode.window.showInformationMessage(message);
}


vscode.workspace.onDidChangeConfiguration((e) => {
	console.log(e.affectsConfiguration("emotionawareide.server.port"));
	if (e.affectsConfiguration("emotionawareide.server.port"))
		connect_to_server()
		
});


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
