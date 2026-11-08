import React,{useState} from 'react';
import {Html} from '@react-three/drei';
import content from '../content.json';
export default function ContactScreen(){
 const [sent,setSent]=useState(false);
 return <Html position={[0,3.2,-9.12]} transform distanceFactor={5.5} occlude>
  <div className="world-contact-screen">
   <strong>{content.contact.screenTitle}</strong>
   <nav>{content.contact.links.map(link=><a key={link.label} href={link.url} target={link.url.startsWith('mailto:')?'_self':'_blank'} rel="noreferrer">{link.label}</a>)}</nav>
   <form onSubmit={e=>{e.preventDefault();const d=new FormData(e.currentTarget);const subject=encodeURIComponent('Portfolio enquiry from '+d.get('name'));const body=encodeURIComponent(d.get('message')+'\nReply to: '+d.get('email'));location.href='mailto:'+content.contact.email+'?subject='+subject+'&body='+body;setSent(true);}}>
    <input name="name" placeholder={content.contact.form.namePlaceholder} required/>
    <input name="email" type="email" placeholder={content.contact.form.emailPlaceholder} required/>
    <textarea name="message" placeholder={content.contact.form.messagePlaceholder} required/>
    <button type="submit">{sent?content.contact.sentLabel:content.contact.hireLabel}</button>
   </form>
  </div>
 </Html>;
}