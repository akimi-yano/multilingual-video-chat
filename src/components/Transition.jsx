import React from 'react'
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';
import { navigate } from "@reach/router"
const Transition = (props) => {

    const timeoutID = window.setTimeout(changeReactComponent, 4000);

    function changeReactComponent() {
        navigate('/chat/' + props.country)
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
                <img src={process.env.PUBLIC_URL + '/paperplane.gif'} />
    <h1 className="lingo-grey">Entering {props.country}</h1>
            </ReactCSSTransitionGroup>
        </div>
    )
}

export default Transition
