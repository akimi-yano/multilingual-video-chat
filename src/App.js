import './App.css';
import React,{createContext} from 'react'
import {Router} from '@reach/router'
import NameForm from './components/NameForm'
import Video from './components/Video'
import DBWrapper from './components/DBWrapper';
import Rooms from './components/Rooms';
import Map from './components/Map'


function App() {

  
  return (
    <div className="App">
      <DBWrapper>
      <Router>
      <NameForm path="/"/>
      <Video path="/chat"/>
      <Rooms path="/rooms"/>
      <Map path="/map" />
      </Router>
      </DBWrapper>
    </div>
  );
}

export default App;
