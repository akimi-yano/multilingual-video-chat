import React,{useState, useContext} from 'react'
import {navigate} from '@reach/router'
import Button from '@material-ui/core/Button';
import Context from '../context/Context'

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
    return (
        <div id="nameForm">
            <h2>What's your name?</h2>
            <p><i class="fas fa-home"></i></p>
            <form onSubmit={onSubmitHandler}>
                <input onChange={onChangeHandler} type="text" value={formState} />
                <Button type="submit" variant="contained" color="primary">Start</Button>
            </form>
            
        </div>
    )
}

export default NameForm
