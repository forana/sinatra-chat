require "sequel"
require "time"

DB = Sequel.connect(ENV["DATABASE_URL"])

def _friendly_time
    time = Time.new
    return sprintf "%d:%02d %s", (time.hour % 12) + 1, time.min, time.hour >= 11 ? "PM" : "AM"
end

def get_channels
    return DB[:channels].all
end

def create_channel(name)
    id = DB[:channels].insert(
        :name => name
    )
    DB[:messages].insert(
        :channel => id,
        :type => "meta",
        :source => "somebody",
        :text => "created channel #{name}",
        :time => _friendly_time
    )
    return {
        :id => id,
        :name => name
    }
end

def remove_channel(id)
    name = DB[:channels].where(:id => id).first[:name]
    DB[:channels].where(:id => id).delete
    DB[:messages].insert(
        :channel => 1,
        :type => "meta",
        :source => "somebody",
        :text => "destroyed channel #{name}",
        :time => _friendly_time
    )
end

def get_channel_messages(id, maxKnown)
    return DB[:messages].where("channel = ? and id > ?", id, maxKnown).order(:id).all
end

def create_message(id, message)
    newMessage = {
        :channel => id,
        :type => message["type"],
        :source => message["source"],
        :text => message["text"],
        :time => _friendly_time
    }
    id = DB[:messages].insert newMessage
    newMessage["id"] = id
    return newMessage
end

unless DB.table_exists? :messages
    DB.create_table :messages do
        primary_key :id
        String :type
        Integer :channel
        String :source
        String :text
        String :time
        index :channel
    end
end

unless DB.table_exists? :channels
    DB.create_table :channels do
        primary_key :id
        String :name
    end

    # start it off with a lobby channel
    create_channel "Lobby"
end
