import React from 'react'
// import React from 'react';
// import { browserHistory } from 'react-router'
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';
// import { connect } from 'react-redux'
import { navigate } from "@reach/router"
const Transition = (props) => {

    const timeoutID = window.setTimeout(changeReactComponent, 4000);

    function changeReactComponent() {
        navigate('/chat/' + props.country)
        window.clearTimeout(timeoutID);
    }


    // let selectedCountry = props.selectedCountry




    // const mapStateToProps = state => {
    //     const selectedCountry = state.map.selectedCountry
    //     return {
    //         selectedCountry
    //     }
    // }



    return (
        <div className="countryTransitionMsg">

            <ReactCSSTransitionGroup
                transitionName="countryTransition"
                transitionAppear={true}
                transitionAppearTimeout={500}
                transitionEnter={false}
                transitionLeave={false}>
                <img src={process.env.PUBLIC_URL + '/paperplane.gif?a=' + Math.random()} />
    <h1 className="lingo-grey">Entering {props.country}</h1>
            </ReactCSSTransitionGroup>
        </div>
    )
}

export default Transition
