// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
//const { once } = require('events');
const vscode = require('vscode');
const net = require('net');

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

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

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "emotionawareide" is now active!');

	// The command has been defined in the package.json file
	let disposable = vscode.commands.registerCommand('emotionawareide.start_dashboard', () => {

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
	});

	// pushes command to context
	context.subscriptions.push(disposable);

	// pushes command to context
	context.subscriptions.push(vscode.commands.registerCommand('emotionawareide.show_message', async () => {

		// gets message from user input
		let message = await vscode.window.showInputBox({
			placeHolder: "Write a message"
		});

		// runs displaymessage with message
		// displayMessage(message);
		client.write(to_msg(message));
	}));

	function to_msg(msg) {
		return msg +"\t\n";
	}

	// cmd

	async function handle_actions(data_arr)
	{
		switch (data_arr[0])
		{
			case "TEST":
				let msg = ""
				for (let i = 0; i < data_arr.lenght; i++)
				{
					msg += data_arr[i] + " "
				}
				let message = await vscode.window.showInputBox({
					placeHolder : "Write response to TEST"
				});
				await displayMessage(msg);
				let complete_msg = "ACT TEST " + message;
				client.write(to_msg(complete_msg))
				break;
			case "SRVY":
				// Launch survey norification
				break;
		}
	}

	function handle_data(data){
		let message = data.toString();
		let cmd_array = message.split(" ");
		switch (cmd_array[0]){
			case "ACT":
				handle_actions(cmd_array.slice(1, cmd_array.length))
				break;
			case "ERR":
				displayMessage(message);
				break;
		}
	}

	// port used for communication
	const port1 = 1338;

	// initialize client
	var client = new net.Socket();

	// connect client
	client.connect(port1, '127.0.0.1', () => {
		console.log('Connected');
		if (client) {
			client.write(to_msg("AACT TEST"));
		}
	});

	// on data received run function
	client.on('data', (data) => {
			handle_data(data);
	});
}


function displayMessage(message) {
	// displays message as popup
	vscode.window.showInformationMessage(message);
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


// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}