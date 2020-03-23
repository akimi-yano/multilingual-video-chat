import React from 'react'
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';
import { navigate } from "@reach/router"
const LeaveChat = (props) => {

    const timeoutID = window.setTimeout(changeReactComponent, 2500);

    function changeReactComponent() {
        navigate('/chat')
        window.clearTimeout(timeoutID);
    }

    return (
        <div className="countryTransitionMsg">

            <ReactCSSTransitionGroup
                transitionName="countryTransition"
                transitionAppear={true}
                transitionAppearTimeout={500}
                transitionEnter={false}
                transitionLeave={false}>
                <img src={process.env.PUBLIC_URL + '/ufo.gif'} />
    <h1 className="lingo-grey">Leaving {props.country}</h1>
            </ReactCSSTransitionGroup>
        </div>
    )
}

export default LeaveChat
