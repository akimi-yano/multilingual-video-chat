import './App.css';
import React from 'react'
import {Router} from '@reach/router'
import NameForm from './components/NameForm'
import Chat from './components/Chat'
import Contexts from './context/Contexts';
import Map from './components/Map'
import EnterChat from './components/EnterChat'
import LeaveChat from './components/LeaveChat'

import 'mapbox.js/dist/mapbox.css'


function App() {

  
  return (
    <div className="App">
      <Contexts>
      <Map/>
      <Router>
      <NameForm path="/"/>
      <Chat path="/chat/:country"/>
      <EnterChat path="/enter/:country" />
      <LeaveChat path="/leave/:country" />
      </Router>
      </Contexts>
    </div>
  );
}

export default App;
