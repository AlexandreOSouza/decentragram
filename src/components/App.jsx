import React, { Component, useEffect, useState } from 'react';
import Web3 from 'web3';
import './App.css';
import Navbar from './Navbar'
import Main from './Main'
import decentragramJson from '../abis/Decentragram.json'

const ipfsClient = require('ipfs-http-client');

const projectId = '2DDxh3LUe1hg9Uaf7IjdVBwu1QQ';
const projectSecret = '653db6383684e5d1c3c3c0ef822a60fd';

const auth = 'Basic ' + Buffer.from(projectId + ':' + projectSecret).toString('base64');

const ipfs = ipfsClient({ 
  host: 'ipfs.infura.io', 
  port: '5001', 
  protocol: 'https',
  headers: {
    authorization: auth
  }

});

const App = () => {

  const [account, setAccount] = useState('');
  const [loading, setLoading] = useState(false);
  const [contract, setContract] = useState();
  const [images, setImages] = useState([]);
  const [imagesCount, setImagesCount] = useState(0);
  const [imageBuffer, setImageBuffer] = useState();

  const loadWeb3 = async () => {
    if (window.ethereum) {
      window.web3 = new Web3(window.ethereum);
      await window.ethereum.enable();
    } else if (window.web3) {
      window.web3 = new Web3(window.web3.currentProvider);
    } else {
      window.alert('Non-Ethereum browser detected. You should consider trying MetaMask!');
    }
  }

  const loadBlockchainData = async () => {
    setLoading(true);
    const web3 = await window.web3;
    const accounts = await window.web3.eth.getAccounts();
    setAccount(accounts[0]);

    const networkId = await web3.eth.net.getId();
    const networkData = await decentragramJson.networks[networkId];
    if (networkData) {
      const decentContract = web3.eth.Contract(decentragramJson.abi, networkData.address);
      setContract(decentContract);
      const imageCount = await decentContract.methods.imageCount().call();
      setImagesCount(imageCount)

      for (var i = 1; i <= imageCount; i++) {
        const image = await decentContract.methods.images(i).call();
        setImages(images => [...images, image])
      }

    } else {
      alert('Smart contract not deployed to detected network.');
    }
    setLoading(false);
  }

  const captureFile = (event) => {
    event.preventDefault();
    const file = event.target.files[0];
    const reader = new window.FileReader();
    reader.readAsArrayBuffer(file);

    reader.onloadend = async () => {
      const buffer = Buffer(reader.result)
      setImageBuffer(buffer);
    }
  }

  const uploadImage = description => {
    ipfs.add(imageBuffer, (error, result) => {
      console.log('Ipfs result', result)
      if (error) {
        console.error(error);
        return
      }
      setLoading(true);
      contract.methods.uploadImage(result[0].hash, description)
      .send({ from: account })
      .on('transactionHash', (hash) => {
        setLoading(false)
      })
    })
  }

  const tipImageOwner = (id, tipAmount) => {
    setLoading(true);
    contract.methods.tipImageOwner(id).send({from: account, value: tipAmount}).on('transactionHash', (hash) => {
      setLoading(false)
    })
  }

  useEffect(() => {
    loadWeb3();
    loadBlockchainData();
  }, []);

    return (
      <div>
        <Navbar account={account}/>
        { loading
          ? <div id="loader" className="text-center mt-5"><p>Loading...</p></div>
          : <Main 
              captureFile={captureFile}
              uploadImage={uploadImage}
              images={images}
              tipImageOwner={tipImageOwner}
            />
        }
      </div>
    )
}

export default App;