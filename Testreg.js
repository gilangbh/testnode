var Contract = require('truffle-contract')
var TestRPC = require('ethereumjs-testrpc');
var Web3 = require('web3')
var Transaction = require('ethereumjs-tx');
var Promise = require('bluebird')
var coder = require('web3/lib/solidity/coder');
var CryptoJS = require('crypto-js');

var testRegArtifact = { "contract_name": "TestRegistry", "abi": [ { "constant": true, "inputs": [ { "name": "", "type": "address" } ], "name": "registry", "outputs": [ { "name": "", "type": "uint256" } ], "payable": false, "type": "function" }, { "constant": false, "inputs": [ { "name": "with", "type": "uint256" }, { "name": "many", "type": "address" }, { "name": "strange", "type": "string" }, { "name": "params", "type": "uint256" } ], "name": "reallyLongFunctionName", "outputs": [], "payable": false, "type": "function" }, { "constant": false, "inputs": [], "name": "testThrow", "outputs": [], "payable": false, "type": "function" }, { "constant": false, "inputs": [ { "name": "x", "type": "uint256" } ], "name": "register", "outputs": [], "payable": false, "type": "function" } ], "unlinked_binary": "0x606060405234610000575b61017b806100196000396000f300606060405263ffffffff60e060020a600035041663038defd781146100455780630da9a4241461007057806350bff6bf146100d4578063f207564e146100e3575b610000565b346100005761005e600160a060020a03600435166100f5565b60408051918252519081900360200190f35b3461000057604080516020600460443581810135601f81018490048402850184019095528484526100d29482359460248035600160a060020a031695606494929391909201918190840183828082843750949650509335935061010792505050565b005b34610000576100d2610040565b005b34610000576100d2600435610130565b005b60006020819052908152604090205481565b600160a060020a03831660009081526020819052604090208190555b50505050565b610000565b565b600160a060020a03331660009081526020819052604090208190555b505600a165627a7a72305820cb91dd6e3f04cdc9c738360fa22a89e466a845485c2c5df43ad25d11eff687120029", "networks": {}, "schema_version": "0.0.5", "updated_at": 1498489105320 }
var keypair = { "privateKey": "0x3686e245890c7f997766b73a21d8e59f6385e1208831af3862574790cbc3d158",
                "address": "0x7f2d6bb19b6a52698725f4a292e985c51cefc315" }

var provider = TestRPC.provider()
var web3 = new Web3(provider)
var TestRegistry = Contract(testRegArtifact)
TestRegistry.setProvider(provider)
web3.eth = Promise.promisifyAll(web3.eth)

var accounts = Object.keys(provider.manager.state.accounts)
var txParams = {from: accounts[0], gas: 2000000}
var testNum = 1234
var data = '0x' + encodeFunctionTxData('register', ['uint256'], [testNum])
var testReg

TestRegistry.new(txParams).then(instance => {
  testReg = instance
  return testReg.registry.call(keypair.address)
}).then(registeredNum => {
  console.log('Registered number before tx: ' + registeredNum.toNumber())
  return web3.eth.getBalanceAsync(keypair.address)
}).then(bal => {
  console.log('Balance before tx: ', bal.toNumber())
  return web3.eth.getTransactionCountAsync(keypair.address)
}).then(nonce => {
  var tx = new Transaction({
    to: testReg.address,
    value: 0,
    nonce: nonce,
    data: data,
    gasLimit: 2000000
  })
  tx.sign(Buffer.from(keypair.privateKey.slice(2), 'hex'))
  var signedRawTx = tx.serialize().toString('hex')

  return web3.eth.sendRawTransactionAsync(signedRawTx)
}).then(txHash => {
  return web3.eth.getTransactionReceiptAsync(txHash)
}).then(tx => {
  console.log('Gas used: ' + tx.gasUsed)
  return testReg.registry.call(keypair.address)
}).then(registeredNum => {
  console.log('Registered number after tx: ' + registeredNum.toNumber())
  return web3.eth.getBalanceAsync(keypair.address)
}).then(bal => {
  console.log('Balance after tx: ', bal.toNumber())
})

function encodeFunctionTxData(functionName, types, args) {
  var fullName = functionName + '(' + types.join() + ')';
  var signature = CryptoJS.SHA3(fullName, { outputLength: 256 }).toString(CryptoJS.enc.Hex).slice(0, 8);
  var dataHex = signature + coder.encodeParams(types, args);

  return dataHex;
}