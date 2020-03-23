import './App.css';
import React,{createContext} from 'react'
import {Router} from '@reach/router'
import NameForm from './components/NameForm'
import Chat from './components/Chat'
import Contexts from './components/Contexts';
import Rooms from './components/Rooms';
import Map from './components/Map'
import Transition from './components/Transition'

import 'mapbox.js/dist/mapbox.css'



function App() {

  
  return (
    <div className="App">
      <Contexts>
      <Map/>
      <Router>
      <NameForm path="/"/>
      <Chat path="/chat/:country"/>
      <Transition path="/transition/:country" />
      </Router>
      </Contexts>
    </div>
  );
}

export default App;
