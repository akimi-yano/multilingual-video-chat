import React,{useState, useContext} from 'react'
import {navigate} from '@reach/router'

import Context from '../context/Context'

// For styling - material UI
import Button from '@material-ui/core/Button';
import { makeStyles } from '@material-ui/core/styles';
import Paper from '@material-ui/core/Paper';
// import { yellow } from '@material-ui/core/colors';
import HelpIcon from '@material-ui/icons/Help';
import CreateIcon from '@material-ui/icons/Create';
import LocalAirportIcon from '@material-ui/icons/LocalAirport';

const NameForm = () => {
    
   
    const context = useContext(Context)
    const [formState, setFormState]=useState("")
    
    // for avatar
    const [numState, setNumState]= useState(1)
    const [numEyeState, setNumEyeState]= useState(1)
    const [numMouthState, setNumMouthState]= useState(1)

    const [arrowXLeft, setArrowXLeft]=useState(1)
    const [arrowXRight, setArrowXRight]=useState(1)
    const [arrowYLeft, setArrowYLeft]=useState(1)
    const [arrowYRight, setArrowYRight]=useState(1)
    const [arrowZLeft, setArrowZLeft]=useState(1)
    const [arrowZRight, setArrowZRight]=useState(1)


    // for information
    const [accessState, setAccessState]=useState(0)

    const onChangeHandler=e=>{
        setFormState(e.target.value)
    }
    const onSubmitHandler=e=>{
        e.preventDefault();
        let avatar = [numState, numEyeState, numMouthState]
        context.setupNameAvatar(formState, avatar)
        navigate('/chat')
    }


    // Styling
    const useStyles = makeStyles(theme => ({
        root: {
          display: 'flex',
        //   justifyContent: "space-evenly",
          flexWrap: 'wrap',
          '& > *': {
            width: "500px",
            height: theme.spacing(64),
            margin: '10px auto',
          },
        },
      }));
    const classes = useStyles();

    const addNum=()=>{
      if (numState==17){
        setNumState(1)
      }
      else{
        setNumState(numState+1)
      }
    }
    const reduceNum=()=>{
      if (numState==1){
        setNumState(17)
      }
      else{
        setNumState(numState-1)
      }
    }
    const addEyeNum=()=>{
      if (numEyeState==24){
        setNumEyeState(1)
      }
      else{
        setNumEyeState(numEyeState+1)
      }
    }
    const reduceEyeNum=()=>{
      if (numEyeState==1){
        setNumEyeState(24)
      }
      else{
        setNumEyeState(numEyeState-1)
      }
    }
    const addMouthNum=()=>{
      if (numMouthState==16){
        setNumMouthState(1)
      }
      else{
        setNumMouthState(numMouthState+1)
      }
    }
    const reduceMouthNum=()=>{
      if (numMouthState==1){
        setNumMouthState(16)
      }
      else{
        setNumMouthState(numMouthState-1)
      }
    }
    const randomize=()=>{
      setNumState(Math.floor(Math.random() * 17) + 1)
      setNumEyeState(Math.floor(Math.random() * 24) + 1)
      setNumMouthState(Math.floor(Math.random() * 16) + 1)
    }
    const changeColorXLeft=()=>{
      setArrowXLeft(2)
    }
    const changeColorXRight=()=>{
      setArrowXRight(2)
    }
    const changeColorYLeft=()=>{
      setArrowYLeft(2)
    }
    const changeColorYRight=()=>{
      setArrowYRight(2)
    }
    const changeColorZLeft=()=>{
      setArrowZLeft(2)
    }
    const changeColorZRight=()=>{
      setArrowZRight(2)
    }
    const resetColorXLeft=()=>{
      setArrowXLeft(1)
    }
    const resetColorXRight=()=>{
      setArrowXRight(1)
    }
    const resetColorYLeft=()=>{
      setArrowYLeft(1)
    }
    const resetColorYRight=()=>{
      setArrowYRight(1)
    }
    const resetColorZLeft=()=>{
      setArrowZLeft(1)
    }
    const resetColorZRight=()=>{
      setArrowZRight(1)
    }
    return (
        <div id="nameForm" className="element">
            <h2 className="namePage"><span className="jump">i</span>ce cand<span className="jump">i</span></h2>
            <div className={classes.root}>
      <Paper elevation={3} style={{display:'inline-block'}}>
      <CreateIcon style={{ fontSize: 40, color: "gray", margin:'15px', marginBottom: '-10px'}} />
            <p style={{fontSize:'16px', margin: '25px',  fontFamily: "'Chelsea Market', cursive"}} >Choose your avatar and name to start</p>
            <div style={{border:"3px dotted black", height: '200px', width: '320px', margin: 'auto'}}>
              <img onClick={randomize} src= {process.env.PUBLIC_URL + '/randomize.gif'}/>
              <div style={{border:"1px solid transparent", margin: "auto", width: '80px', height:'80px', borderRadius:"50%"}}>
        <img onClick={reduceNum} className={'arrowLeft'+ arrowXLeft.toString()} onMouseEnter={changeColorXLeft} onMouseLeave={resetColorXLeft} src= {process.env.PUBLIC_URL + '/arrow.gif'}/>
        <div className={'x'+ numState.toString()} >
        <img src= {process.env.PUBLIC_URL + '/color_atlas.gif'}/>
        </div>
        <img onClick={addNum} className={'arrowRight'+ arrowXRight.toString()} onMouseEnter={changeColorXRight} onMouseLeave={resetColorXRight} src= {process.env.PUBLIC_URL + '/arrow.gif'}/> 
        
        <img onClick={reduceEyeNum} className={'arrowLeftY'+ arrowYLeft.toString()} onMouseEnter={changeColorYLeft} onMouseLeave={resetColorYLeft} src= {process.env.PUBLIC_URL + '/arrow.gif'}/>
        <div className={'y'+ numEyeState.toString()}>
        <img  src= {process.env.PUBLIC_URL + '/eyes_atlas.gif'}/>
        </div>
        <img onClick={addEyeNum} className={'arrowRightY'+ arrowYRight.toString()} onMouseEnter={changeColorYRight} onMouseLeave={resetColorYRight} src= {process.env.PUBLIC_URL + '/arrow.gif'}/> 
        
        <img onClick={reduceMouthNum} className={'arrowLeftZ'+ arrowZLeft.toString()} onMouseEnter={changeColorZLeft} onMouseLeave={resetColorZLeft} src= {process.env.PUBLIC_URL + '/arrow.gif'}/>
        <div className={'z'+ numMouthState.toString()}>
        <img  src= {process.env.PUBLIC_URL + '/mouth_atlas.gif'}/>
        </div>
        <img onClick={addMouthNum} className={'arrowRightZ'+ arrowZRight.toString()} onMouseEnter={changeColorZRight} onMouseLeave={resetColorZRight} src= {process.env.PUBLIC_URL + '/arrow.gif'}/> 
          
        </div>
        </div>
        <form onSubmit={onSubmitHandler}>

                <input placeholder="Your Name" style={{height:'40px', width:'160px', margin: '25px 25px 25px -5px', padding: '5px', fontSize:'15px', fontFamily: "'Chelsea Market', cursive", outline:'none'}} onChange={onChangeHandler} type="text" value={formState} />
                <Button style={{height:'50px'}} type="submit" variant="contained" color="primary" endIcon={<LocalAirportIcon/>}>Start</Button>
            </form>
          
          </Paper>

          <Paper elevation={3} style={{display:'inline-block'}} >
          <HelpIcon style={{ fontSize: 40, color: "gray", margin:'15px', marginBottom: '-10px' }} />
          <div style={{margin:'25px', padding: '5px', fontSize:'15px'}}>
          
          <Button onClick={e => setAccessState(0)} style={{height:'50px', margin:'0px 10px'}} variant="outlined" color="primary">About</Button>
          <Button onClick={e => setAccessState(1)} style={{height:'50px', margin:'0px 10px'}} variant="outlined" color="primary">How to use</Button>
          <Button onClick={e => setAccessState(2)} style={{height:'50px', margin:'0px 10px'}} variant="outlined" color="primary">Technologies</Button>
          </div>
          <div>
          {accessState===0
          ? <div><p className="infoText">ICE CANDI is a peer-to-peer multi-lingual video chat webapp. A user can connect with another peer and communicate in different languages using the voice translation feature.</p>
          <p className="infoText">Supported media types: text-chat (typing and voice), call and video chat.</p>
          <p className="infoText">Languages: English, Spanish, French, Japanese, Chinese, Portuguese, Korean, Russian.</p></div>
          : accessState === 1
            ? <div><p className="infoText">1. Choose an avatar and name.</p>
            <p className="infoText">2. Choose a country from the world map on the next page. Highlighted countries show that there is someone waiting for you! You can also start a chat by choosing a country that is not highlighted.</p>
            <p className="infoText">3. Once a peer arrives, start  a chat! You can send a text, call and video chat! You have the option to translate what you say by selecting your speaking language and translated language.</p></div>
            : <div><ul><li className="infoText" >React & Material UI</li>
            <li className="infoText">Web RTC</li> 
            <li className="infoText">Firebase - Firestore</li> 
            <li className="infoText">Azure - Cloud Functions</li> 
            <li className="infoText">Azure - Speech Translation API</li> 
            <li className="infoText">Web Speech API</li> 
            <li className="infoText">Leaflet & Mapbox</li> 
            <li className="infoText">Illustrator & Photoshop</li>
            </ul></div>

        }


          </div>
          </Paper>
    </div>
  
           
        </div>
    )
}

export default NameForm
