import React,{useState, useContext} from 'react'
import {navigate} from '@reach/router'

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
            <form onSubmit={onSubmitHandler}>
                <input onChange={onChangeHandler} type="text" value={formState} />
                <button type="submit">Start</button>
            </form>
            
        </div>
    )
}

export default NameForm
