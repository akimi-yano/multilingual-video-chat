import './App.css';
import React,{createContext} from 'react'
import {Router} from '@reach/router'
import NameForm from './components/NameForm'
import Video from './components/Video'
import DBWrapper from './components/DBWrapper';
import Rooms from './components/Rooms';
import Map from './components/Map'
import Transition from './components/Transition'

import 'mapbox.js/dist/mapbox.css'


function App() {

  
  return (
    <div className="App">
      <DBWrapper>
      <Map/>
      <Router>
      <NameForm path="/"/>
      <Video path="/chat/:country"/>
      <Transition path="/transition/:country" />
      </Router>
      </DBWrapper>
    </div>
  );
}

export default App;
