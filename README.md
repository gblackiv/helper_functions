
# How To Use

1. Copy and paste function into `\functions\index.js` and save file
2. Open CLI, and run these commands:
	- `firebase use batteries-fb` - this will ensure you are targeting the live project
	- `firebase functions:shell` - this begins the functions shell
	- `nameOfFunctionToRun()` - this is the command to run the function
3. After the function is complete, exit out of the shell (`CTRL-C`)
4. Remove the function from `\functions\index.js` and save file

If you want to run the function on the dev database, replace `firebase use batteries-fb` with `firebase use batteries-fb-dev`
