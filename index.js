var Contract = require('truffle-contract')
var Web3 = require('web3')
var Transaction = require('ethereumjs-tx');
var Promise = require('bluebird')
var coder = require('web3/lib/solidity/coder');
var CryptoJS = require('crypto-js');
var fs = require('fs');

var provider = new Web3.providers.HttpProvider("http://localhost:8545");
var web3 = new Web3(provider);
var keypair = {
  "privateKey" : "0x25ed45ec7c41ac5307f13c8a128b828ba0bda3d05472f7fb30e255997d159485",
  "address" : "0x64de4f6288eab16990032b7c8e2dcbde1a78dfc1"
}
var file = fs.readFileSync("Simplestorage.json");
var simplestorageArtifact = JSON.parse(file);
var Simplestorage = Contract(simplestorageArtifact);
Simplestorage.setProvider(provider);
web3.eth = Promise.promisifyAll(web3.eth);

var txParams = {from:"0x64de4f6288eab16990032b7c8e2dcbde1a78dfc1", gas:2000000}
var testNum = 98765
var data = '0x' + encodeFunctionTxData('setStorageInteger',['uint32'],testNum)
var contractinstance;

Simplestorage.new(txParams).then(instance => {
  contractinstance = instance;
  return contractinstance.getStorageInteger.call(keypair.address);
}).then(storedInteger => {
  console.log('Stored Integer before tx = ' + storedInteger.toNumber());
  return web3.eth.getTransactionCountAsync(keypair.address);
}).then(nonce => {
  var tx = new Transaction({
    to: contractinstance.address,
    value: 0,
    nonce: nonce,
    data: data,
    gasLimit: 2000000
  });
  tx.sign(Buffer.from(keypair.privateKey.slice(2), 'hex'));
  var signedRawTx = tx.serialize().toString('hex');

  return web3.eth.sendRawTransactionAsync(signedRawTx);
}).then(txHash => {
  return web3.eth.getTransactionReceiptAsync(txHash)
}).then(tx => {
  console.log('Gas used: ' + tx.gasUsed)
  return contractinstance.registry.call(keypair.address)
}).then(storedInteger => {
  console.log('Registered number after tx: ' + storedInteger.toNumber())
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