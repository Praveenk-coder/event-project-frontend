import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { API_URL } from './config';
import './App.css';

const emptyEvent = {
  title: '',
  description: '',
  date: '',
  location: '',
  capacity: 10,
};

const formatDate = (value) => new Date(value).toLocaleString();

function App() {
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [eventForm, setEventForm] = useState(emptyEvent);
  const [eventFile, setEventFile] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [search, setSearch] = useState('');
  const [dashboardFilter, setDashboardFilter] = useState('all');

  const headers = useMemo(
    () => ({
      Authorization: token ? `Bearer ${token}` : undefined,
    }),
    [token]
  );

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/events`);
      setEvents(res.data);
    } catch (err) {
      setMessage(err?.response?.data?.message || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (type) => {
    try {
      const endpoint = type === 'login' ? 'login' : 'signup';
      const res = await axios.post(`${API_URL}/api/auth/${endpoint}`, authForm);
      const { token: tk, user: usr } = res.data;
      setToken(tk);
      setUser(usr);
      localStorage.setItem('token', tk);
      localStorage.setItem('user', JSON.stringify(usr));
      setMessage(`Welcome, ${usr.name}`);
    } catch (err) {
      setMessage(err?.response?.data?.message || 'Authentication failed');
    }
  };

  const handleLogout = () => {
    setToken('');
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const handleEventSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!token) {
        setMessage('Please login first');
        return;
      }
      const formData = new FormData();
      Object.entries(eventForm).forEach(([key, value]) => formData.append(key, value));
      if (eventFile) formData.append('image', eventFile);

      if (editingEvent) {
        await axios.put(`${API_URL}/api/events/${editingEvent._id}`, formData, {
          headers: { ...headers, 'Content-Type': 'multipart/form-data' },
        });
        setMessage('Event updated');
      } else {
        await axios.post(`${API_URL}/api/events`, formData, {
          headers: { ...headers, 'Content-Type': 'multipart/form-data' },
        });
        setMessage('Event created');
      }
      setEventForm(emptyEvent);
      setEventFile(null);
      setEditingEvent(null);
      fetchEvents();
    } catch (err) {
      setMessage(err?.response?.data?.message || 'Could not save event');
    }
  };

  const handleEdit = (ev) => {
    setEditingEvent(ev);
    setEventForm({
      title: ev.title,
      description: ev.description,
      date: ev.date?.slice(0, 16),
      location: ev.location,
      capacity: ev.capacity,
    });
    setEventFile(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this event?')) return;
    try {
      await axios.delete(`${API_URL}/api/events/${id}`, { headers });
      setMessage('Event deleted');
      fetchEvents();
    } catch (err) {
      setMessage(err?.response?.data?.message || 'Could not delete');
    }
  };

  const handleRsvp = async (id) => {
    try {
      await axios.post(`${API_URL}/api/events/${id}/rsvp`, {}, { headers });
      fetchEvents();
    } catch (err) {
      setMessage(err?.response?.data?.message || 'Could not RSVP');
    }
  };

  const handleUnrsvp = async (id) => {
    try {
      await axios.post(`${API_URL}/api/events/${id}/unrsvp`, {}, { headers });
      fetchEvents();
    } catch (err) {
      setMessage(err?.response?.data?.message || 'Could not leave event');
    }
  };

  const filteredEvents = events.filter((ev) => {
    const matchesSearch =
      ev.title.toLowerCase().includes(search.toLowerCase()) ||
      ev.location.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (!user) return true;
    if (dashboardFilter === 'created') return ev.createdBy?._id === user.id;
    if (dashboardFilter === 'attending')
      return ev.attendees?.some((a) => (a._id || a) === user.id);
    return true;
  });

  return (
    <div className="page">
      <header className="topbar">
        <div>
          <h1>Mini Event Platform</h1>
          <p>Create, share, and RSVP to events with capacity protection.</p>
        </div>
        <div className="top-actions">
          {user ? (
            <>
              <span className="pill">Hi, {user.name}</span>
              <button className="ghost" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : null}
        </div>
      </header>

      {message ? <div className="banner">{message}</div> : null}

      {!user ? (
        <section className="card auth">
          <div className="tabs">
            <button
              className={authMode === 'login' ? 'active' : ''}
              onClick={() => setAuthMode('login')}
            >
              Login
            </button>
            <button
              className={authMode === 'signup' ? 'active' : ''}
              onClick={() => setAuthMode('signup')}
            >
              Sign Up
            </button>
          </div>
          {authMode === 'signup' && (
            <input
              placeholder="Name"
              value={authForm.name}
              onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
            />
          )}
          <input
            placeholder="Email"
            value={authForm.email}
            onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
          />
          <input
            placeholder="Password"
            type="password"
            value={authForm.password}
            onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
          />
          <button onClick={() => handleAuth(authMode)} className="primary">
            {authMode === 'login' ? 'Login' : 'Create Account'}
          </button>
        </section>
      ) : (
        <section className="card">
          <h2>{editingEvent ? 'Edit Event' : 'Create Event'}</h2>
          <form className="event-form" onSubmit={handleEventSubmit}>
            <input
              placeholder="Title"
              required
              value={eventForm.title}
              onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
            />
            <textarea
              placeholder="Description"
              required
              value={eventForm.description}
              onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
            />
            <div className="grid-2">
              <input
                type="datetime-local"
                required
                value={eventForm.date}
                onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
              />
              <input
                placeholder="Location"
                required
                value={eventForm.location}
                onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
              />
            </div>
            <div className="grid-2">
              <input
                type="number"
                min="1"
                required
                value={eventForm.capacity}
                onChange={(e) => setEventForm({ ...eventForm, capacity: e.target.value })}
              />
              <input type="file" accept="image/*" onChange={(e) => setEventFile(e.target.files[0])} />
            </div>
            <div className="form-actions">
              <button type="submit" className="primary">
                {editingEvent ? 'Save Changes' : 'Create Event'}
              </button>
              {editingEvent ? (
                <button
                  type="button"
                  className="ghost"
                  onClick={() => {
                    setEditingEvent(null);
                    setEventForm(emptyEvent);
                    setEventFile(null);
                  }}
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
        </section>
      )}

      <section className="controls card">
        <div className="grid-2">
          <input
            placeholder="Search by title or location"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {user ? (
            <select value={dashboardFilter} onChange={(e) => setDashboardFilter(e.target.value)}>
              <option value="all">All events</option>
              <option value="created">My created</option>
              <option value="attending">My RSVPs</option>
            </select>
          ) : null}
        </div>
      </section>

      <section className="event-grid">
        {loading ? (
          <div className="card">Loading events...</div>
        ) : filteredEvents.length === 0 ? (
          <div className="card">No events match your filters.</div>
        ) : (
          filteredEvents.map((ev) => {
            const attending = user && ev.attendees?.some((a) => (a._id || a) === user.id);
            const isOwner = user && (ev.createdBy?._id || ev.createdBy) === user.id;
            const spotsLeft = ev.capacity - (ev.attendees?.length || 0);
            return (
              <article key={ev._id} className="card event">
                {ev.imageUrl ? (
                  <img src={`${API_URL}${ev.imageUrl}`} alt={ev.title} className="thumb" />
                ) : (
                  <div className="thumb placeholder">No Image</div>
                )}
                <div className="event-body">
                  <div className="event-header">
                    <div>
                      <h3>{ev.title}</h3>
                      <p className="muted">{ev.location}</p>
                    </div>
                    <span className="pill">{formatDate(ev.date)}</span>
                  </div>
                  <p>{ev.description}</p>
                  <div className="meta">
                    <span>
                      Capacity: {ev.attendees?.length || 0}/{ev.capacity}{' '}
                      {spotsLeft <= 0 ? '(Full)' : ''}
                    </span>
                    {ev.createdBy?.name ? <span>Host: {ev.createdBy.name}</span> : null}
                  </div>
                  <div className="actions">
                    {user ? (
                      <>
                        {attending ? (
                          <button className="ghost" onClick={() => handleUnrsvp(ev._id)}>
                            Leave
                          </button>
                        ) : (
                          <button
                            className="primary"
                            disabled={spotsLeft <= 0}
                            onClick={() => handleRsvp(ev._id)}
                          >
                            {spotsLeft <= 0 ? 'Full' : 'RSVP'}
                          </button>
                        )}
                        {isOwner ? (
                          <>
                            <button onClick={() => handleEdit(ev)}>Edit</button>
                            <button className="danger" onClick={() => handleDelete(ev._id)}>
                              Delete
                            </button>
                          </>
                        ) : null}
                      </>
                    ) : (
                      <span className="muted">Login to RSVP</span>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}

export default App;
