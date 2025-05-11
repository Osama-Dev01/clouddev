
import {BrowserRouter,Route, Routes} from "react-router-dom"
import NavBar from './navbar'
import ClientServer from './ClientServer.jsx'
import AddUser from './AddUser.jsx'
import EditUser from "./EditUser.jsx"
import Login from './Login';      
import SignUp from './SignUp';    

import './App.css'

function App() {
  
  return (

    <>
      <BrowserRouter>
        <NavBar />
        <Routes>

          <Route path="/" element={<ClientServer />}/>
          <Route path="/addUser" element={<AddUser/>}/>
          <Route path="/edit/:id" element={<EditUser />} />
          {/* <Route path="/login" element={<Login />} />       
          <Route path="/signup" element={<SignUp />} />      */}

        </Routes>
      </BrowserRouter> 
    </>
  )
}

export default App
