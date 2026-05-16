package com.lms.ai.provider;

import com.lms.ai.domain.ProviderType;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@Component
public class ProviderRegistry {

    private final Map<ProviderType, AiProviderClient> clients = new EnumMap<>(ProviderType.class);

    public ProviderRegistry(List<AiProviderClient> all) {
        for (AiProviderClient c : all) {
            clients.put(c.type(), c);
        }
    }

    public AiProviderClient clientFor(ProviderType type) {
        AiProviderClient c = clients.get(type);
        if (c == null) throw new ProviderException("No client registered for type " + type);
        return c;
    }
}
