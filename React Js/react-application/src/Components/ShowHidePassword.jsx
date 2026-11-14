import React, { useState } from 'react'

export default function ShowHidePassword() {

    const [isVisible, setIsVisible] = useState(true);

  return (
    <>
      <input type={ isVisible ? 'text' : 'password' }/>

      <button onClick={ () => setIsVisible(!isVisible) }  >{ isVisible ? 'Hide Password' : 'Show Password' }</button>
    </>
  )
}
