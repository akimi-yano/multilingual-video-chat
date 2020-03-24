import React,{useState, useContext} from 'react'
import {navigate} from '@reach/router'

import Context from '../context/Context'

// For styling - material UI
import Button from '@material-ui/core/Button';
import { makeStyles } from '@material-ui/core/styles';
import Paper from '@material-ui/core/Paper';
import { yellow } from '@material-ui/core/colors';
import HelpIcon from '@material-ui/icons/Help';
import CreateIcon from '@material-ui/icons/Create';
import LocalAirportIcon from '@material-ui/icons/LocalAirport';

const NameForm = () => {
    

    const context = useContext(Context)
    const [formState, setFormState]=useState("")
    const onChangeHandler=e=>{
        setFormState(e.target.value)
    }
    const onSubmitHandler=e=>{
        e.preventDefault();
        context.setName(formState)
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
 
    return (
        <div id="nameForm">
           
            <h2 className="namePage">Multilingual Video Chat</h2>
            <img style={{width:'200px', display: "inline-block", float: "right", marginRight:'100px', marginTop:'10px'}} src="hello.png"/>
            <div className={classes.root}>
      <Paper elevation={3} style={{display:'inline-block'}}>
      <CreateIcon style={{ fontSize: 40, color: "gray", margin:'15px', marginBottom: '-10px'}} />
            <form onSubmit={onSubmitHandler}>
                <input placeholder="Your Name" style={{height:'40px', width:'200px', margin: '20px', padding: '5px', fontSize:'15px'}} onChange={onChangeHandler} type="text" value={formState} />
                <Button style={{height:'50px'}} type="submit" variant="contained" color="primary" endIcon={<LocalAirportIcon/>}>Start</Button>
                
                
           
            </form>
          </Paper>

          <Paper elevation={3} style={{display:'inline-block'}} >
          <HelpIcon style={{ fontSize: 40, color: "gray", margin:'15px', marginBottom: '-10px' }} />
          <div style={{margin:'20px', padding: '5px', fontSize:'15px'}}>
          <Button style={{height:'50px', margin:'0px 10px'}} variant="outlined" color="primary">About</Button>
          <Button style={{height:'50px', margin:'0px 10px'}} variant="outlined" color="primary">How to use</Button>
          <Button style={{height:'50px', margin:'0px 10px'}} variant="outlined" color="primary">Technologies</Button>
  
          </div>
          </Paper>
    </div>
            
        </div>
    )
}

export default NameForm
