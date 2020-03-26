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


    const onChangeHandler=e=>{
        setFormState(e.target.value)
    }
    const onSubmitHandler=e=>{
        e.preventDefault();
        context.setNameStateAndCookie(formState)
        context.setAvatar([numState, numEyeState, numMouthState])
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
            height: theme.spacing(50),
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
      if (numEyeState==31){
        setNumEyeState(1)
      }
      else{
        setNumEyeState(numEyeState+1)
      }
    }
    const reduceEyeNum=()=>{
      if (numEyeState==1){
        setNumEyeState(31)
      }
      else{
        setNumEyeState(numEyeState-1)
      }
    }
    const addMouthNum=()=>{
      if (numMouthState==24){
        setNumMouthState(1)
      }
      else{
        setNumMouthState(numMouthState+1)
      }
    }
    const reduceMouthNum=()=>{
      if (numMouthState==1){
        setNumMouthState(24)
      }
      else{
        setNumMouthState(numMouthState-1)
      }
    }
    const randomize=()=>{
      setNumState(Math.floor(Math.random() * 17) + 1)
      setNumEyeState(Math.floor(Math.random() * 31) + 1)
      setNumMouthState(Math.floor(Math.random() * 24) + 1)
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
        <div id="nameForm">
           
            <h2 className="namePage">Multilingual Video Chat</h2>
            <div className={classes.root}>
      <Paper elevation={3} style={{display:'inline-block'}}>
      <CreateIcon style={{ fontSize: 40, color: "gray", margin:'15px', marginBottom: '-10px'}} />
            <form onSubmit={onSubmitHandler}>
                <input placeholder="Your Name" style={{height:'40px', width:'200px', margin: '20px', padding: '5px', fontSize:'15px'}} onChange={onChangeHandler} type="text" value={formState} />
                <Button style={{height:'50px'}} type="submit" variant="contained" color="primary" endIcon={<LocalAirportIcon/>}>Start</Button>
            </form>
            <div style={{border:"1px solid black", height: '200px', width: '300px', margin: 'auto'}}>
              <img onClick={randomize} src= {process.env.PUBLIC_URL + '/randomize.gif'}/>
              <div style={{border:"1px solid black", width: '80px', height:'80px', borderRadius:"50%"}}>
        <img onClick={reduceNum} className={'arrowLeft'+ arrowXLeft.toString()} onMouseEnter={changeColorXLeft} onMouseLeave={resetColorXLeft} src= {process.env.PUBLIC_URL + '/arrow.gif'}/>
        <div className={'x'+ numState.toString()} >
        <img src= {process.env.PUBLIC_URL + '/color_atlas.gif'}/>
        </div>
        <img onClick={addNum} className={'arrowRight'+ arrowXRight.toString()} onMouseEnter={changeColorXRight} onMouseLeave={resetColorXRight} src= {process.env.PUBLIC_URL + '/arrow.gif'}/> 
        
        {/* <img onClick={reduceEyeNum} className={'arrowLeftY'+ arrowYLeft.toString()} onMouseEnter={changeColorYLeft} onMouseLeave={resetColorYLeft} src= {process.env.PUBLIC_URL + '/arrow.gif'}/>
        <img className={'y'+ numEyeState.toString()} src= {process.env.PUBLIC_URL + '/eyes_atlas.gif'}/>
        <img onClick={addEyeNum} className={'arrowRightY'+ arrowYRight.toString()} onMouseEnter={changeColorYRight} onMouseLeave={resetColorYRight} src= {process.env.PUBLIC_URL + '/arrow.gif'}/> 
        
        <img onClick={reduceMouthNum} className={'arrowLeftZ'+ arrowZLeft.toString()} onMouseEnter={changeColorZLeft} onMouseLeave={resetColorZLeft} src= {process.env.PUBLIC_URL + '/arrow.gif'}/>
        <img className={'z'+ numMouthState.toString()} src= {process.env.PUBLIC_URL + '/mouth_atlas.gif'}/>
        <img onClick={addMouthNum} className={'arrowRightZ'+ arrowZRight.toString()} onMouseEnter={changeColorZRight} onMouseLeave={resetColorZRight} src= {process.env.PUBLIC_URL + '/arrow.gif'}/>  */}
          
        </div>
          </div>
          </Paper>

          <Paper elevation={3} style={{display:'inline-block'}} >
          <HelpIcon style={{ fontSize: 40, color: "gray", margin:'15px', marginBottom: '-10px' }} />
          <div style={{margin:'20px', padding: '5px', fontSize:'15px'}}>
          
          <Button style={{height:'50px', margin:'0px 10px'}} variant="outlined" color="primary">About</Button>
          <Button style={{height:'50px', margin:'0px 10px'}} variant="outlined" color="primary">How to use</Button>
          <Button style={{height:'50px', margin:'0px 10px'}} variant="outlined" color="primary">Technologies</Button>
          <div className="crop">
 
        <img src= {process.env.PUBLIC_URL + '/arrow.gif'}/>
    </div>
          </div>
          </Paper>
    </div>
  
           
        </div>
    )
}

export default NameForm
