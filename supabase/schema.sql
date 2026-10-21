create table if not exists services (
  id serial primary key, name text unique not null,
  price int not null check (price > 0), duration int not null check (duration > 0));
create table if not exists bookings (
  id serial primary key, customer_name text not null, phone text not null check (phone ~ '^[0-9]{10}$'),
  service_id int not null references services(id), date date not null, time text not null,
  status text not null default 'Pending' check (status in ('Pending','Confirmed','Done','Cancelled')),
  created_at timestamptz default now());
-- DB-level safety net: same start slot cannot be held twice by active bookings
create unique index if not exists one_active_booking_per_slot on bookings(date, time) where status <> 'Cancelled';
insert into services (name, price, duration) values
 ('Haircut',200,30),('Beard Trim',100,15),('Hair Spa',800,45),('Facial',500,40),('Bridal Makeup',5000,120)
on conflict (name) do nothing;
insert into bookings (customer_name, phone, service_id, date, time, status) values
 ('Priya Sharma','9876543210',1,current_date,'10:00','Done'),
 ('Rahul Deshmukh','9822012345',3,current_date,'12:00','Confirmed'),
 ('Anita Patil','9890011223',4,current_date,'16:00','Pending')
on conflict do nothing;
