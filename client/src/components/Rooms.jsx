import React, { useContext, useState, useEffect } from 'react'
import Context from '../context/Context'
import {navigate} from "@reach/router"

const Rooms = () => {
    const context = useContext(Context)
    const [roomState, setRoomState] = useState([])

    // console.log("###", context)
    // console.log("***", context.db)
    // if (!(context.db === null)) {

    useEffect(() => {
        if (!(context.db === null)) {
            context.db.collection('rooms').get()
                .then((querySnapshot) => {
                    let rooms = []
                    querySnapshot.forEach((doc) => {
                        console.log(`${doc.id}=>${doc.data()}`);
                        rooms.push(doc.id)
                    })
                    setRoomState(rooms)
                })
        }
    }, [context.db])

    const onClickHandler = (item, e, index) => {
    navigate('/chat')
    }

//         if (!(context.db === null)){
//         context.db.collection('rooms').get()
//         .then((querySnapshot)=>{
//             querySnapshot.forEach((doc)=>{
//                 console.log(`${doc.id}=>${doc.data()}`);
//             })
//         })
//     }
// 


// console.log("ROOMS", rooms)
// setRoomState(rooms)
// console.log(roomState)
// const roomRef = context.db.collection('rooms').doc()
// console.log("test-ids", roomRef)


// }


// const roomRef = context.db.collection('rooms').doc(`${roomId}`)
// const roomRef = context.db.collection('rooms').doc()


return (
    <div>
        {roomState.map((item, index) => (
            <div key={index}>
                <p>{item}</p>
                <button onClick={(e) => onClickHandler(item, e, index)}>Room {index}</button>
            </div>
        )
        )}

    </div>
)
}

export default Rooms
