import React,{useState} from 'react';
import {Html} from '@react-three/drei';
import content from '../content.json';
export default function ContactScreen(){
 const [sent,setSent]=useState(false);
 return <Html position={[0,3.2,-9.12]} transform distanceFactor={5.5} occlude>
  <div className="world-contact-screen">
   <strong>LET'S BUILD SOMETHING</strong>
   <nav>
    <a href={'mailto:'+content.contact.email}>EMAIL</a>
    <a href={content.contact.whatsapp} target="_blank" rel="noreferrer">WHATSAPP</a>
    <a href={content.contact.linkedin} target="_blank" rel="noreferrer">LINKEDIN</a>
    <a href={content.contact.github} target="_blank" rel="noreferrer">GITHUB</a>
   </nav>
   <form onSubmit={e=>{e.preventDefault();const d=new FormData(e.currentTarget);const subject=encodeURIComponent('Portfolio enquiry from '+d.get('name'));const body=encodeURIComponent(d.get('message')+'\nReply to: '+d.get('email'));location.href='mailto:'+content.contact.email+'?subject='+subject+'&body='+body;setSent(true);}}>
    <input name="name" placeholder="Your name" required/>
    <input name="email" type="email" placeholder="Your email" required/>
    <textarea name="message" placeholder="Tell me about your idea" required/>
    <button type="submit">{sent?'OPENING EMAIL…':'HIRE ME ↗'}</button>
   </form>
  </div>
 </Html>;
}