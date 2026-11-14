import React, { useState } from 'react'

export default function Counter() {

    let [counter, setCounter] = useState(5);

    const decrement = () => {
        if (counter > 1) {
            counter--;
            setCounter(counter)
        }
    }

    return (
        <>
            <button onClick={decrement}>-</button>

            <button>{counter}</button>

            <button onClick={() => {
                if (counter < 10) {
                    setCounter(++counter)
                }
            }} >+</button>
        </>
    )
}
