'use client';
import { useState } from 'react';
import styles from './moodle-access.module.css';
export function MoodleSignIn({ username, moodleUrl, registrationId, initialPasswordAvailable }: { username: string; moodleUrl: string; registrationId: string; initialPasswordAvailable?: boolean }) {
  const [pending,setPending]=useState(false), [message,setMessage]=useState('');
  const url=new URL(moodleUrl);url.searchParams.set('username',username);
  async function copy(initialPassword: boolean) {
    setPending(true);setMessage('');
    try {
      let value=username;
      if (initialPassword) {
        const r=await fetch('/api/integration/me/moodle-demo-password',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'content-type':'application/json','x-requested-with':'XMLHttpRequest'},body:JSON.stringify({registrationId})});
        if (!r.ok) throw Error('The initial demo password is unavailable. Use your assigned Moodle password or request support.');
        const data:unknown=await r.json();
        if (!data || typeof data!=='object' || !('initialPassword' in data) || typeof data.initialPassword!=='string') throw Error('The initial demo password could not be confirmed.');
        value=data.initialPassword;
      }
      try { await navigator.clipboard.writeText(value); }
      catch { throw Error('Your browser blocked copying. Allow clipboard access and try again.'); }
      setMessage(initialPassword ? 'Initial Moodle password copied. Paste it in Moodle.' : 'Moodle username copied.');
    } catch(e) { setMessage(e instanceof Error ? e.message : 'Copying is unavailable. Try again.'); }
    finally {setPending(false);}
  }
  return <div className={styles.signin}>
    <div><p><span>Moodle username</span><strong>{username}</strong></p><div className={styles.signinActions}>
      <button type="button" onClick={()=>void copy(false)} disabled={pending}>Copy username</button>
      {initialPasswordAvailable ? <button type="button" onClick={()=>void copy(true)} disabled={pending}>{pending ? 'Copying…' : 'Copy initial Moodle password'}</button> : null}
    </div>{initialPasswordAvailable ? <p className={styles.credentialHelp}>Initial demo password. If you changed it in Moodle, use your new password.</p> : null}<p role="status" aria-live="polite" className={styles.credentialHelp}>{message}</p></div>
    <a href={url.toString()} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" aria-label="Open Moodle platform (opens in new tab)">Open Moodle ↗</a>
  </div>;
}
