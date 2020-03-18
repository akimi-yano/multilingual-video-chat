import './App.css';
import React,{createContext} from 'react'
import {Router} from '@reach/router'
import NameForm from './components/NameForm'
import Video from './components/Video'
import DBWrapper from './components/DBWrapper';




function App() {

  
  return (
    <div className="App">
      <DBWrapper>
      <Router>
      <NameForm path="/"/>
      <Video path="/chat"/>
      </Router>
      </DBWrapper>
    </div>
  );
}

export default App;
